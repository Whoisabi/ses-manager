import { SNSClient, PublishCommand, SetSMSAttributesCommand } from '@aws-sdk/client-sns';

export interface SMSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SendSMSParams {
  phoneNumber: string;
  message: string;
  smsType?: 'Promotional' | 'Transactional';
  senderId?: string;
  originationNumber?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  estimatedCost?: number;
}

export class SMSService {
  private client: SNSClient;
  private rateLimiter: Map<string, number>;

  constructor(config: SMSConfig) {
    this.client = new SNSClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.rateLimiter = new Map();
  }

  async configureSMS(monthlySpendLimit: string = '500'): Promise<void> {
    try {
      await this.client.send(
        new SetSMSAttributesCommand({
          attributes: {
            DefaultSMSType: 'Transactional',
            MonthlySpendLimit: monthlySpendLimit,
          },
        })
      );
    } catch (error) {
      console.error('Error configuring SMS settings:', error);
    }
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  checkRateLimit(phoneNumber: string): boolean {
    const now = Date.now();
    const lastSent = this.rateLimiter.get(phoneNumber);

    if (lastSent && now - lastSent < 60000) {
      return false;
    }

    this.rateLimiter.set(phoneNumber, now);
    return true;
  }

  optimizeMessage(message: string): string {
    if (message.length <= 160) {
      return message;
    }
    
    console.warn(`Message truncated from ${message.length} to 160 characters`);
    return message.substring(0, 157) + '...';
  }

  estimateCost(messageLength: number, recipientCount: number = 1): number {
    const segments = Math.ceil(messageLength / 160);
    const costPerSegment = 0.00645;
    return segments * costPerSegment * recipientCount;
  }

  async sendSMS(params: SendSMSParams): Promise<SMSResult> {
    try {
      if (!this.validatePhoneNumber(params.phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format. Must be E.164 format (e.g., +1234567890)',
        };
      }

      if (!this.checkRateLimit(params.phoneNumber)) {
        return {
          success: false,
          error: 'Rate limit exceeded. Only 1 SMS per minute per number allowed.',
        };
      }

      const optimizedMessage = this.optimizeMessage(params.message);
      const estimatedCost = this.estimateCost(optimizedMessage.length);

      const command = new PublishCommand({
        PhoneNumber: params.phoneNumber,
        Message: optimizedMessage,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: params.smsType || 'Transactional',
          },
          ...(params.senderId && {
            'AWS.SNS.SMS.SenderID': {
              DataType: 'String',
              StringValue: params.senderId,
            },
          }),
          ...(params.originationNumber && {
            'AWS.SNS.SMS.OriginationNumber': {
              DataType: 'String',
              StringValue: params.originationNumber,
            },
          }),
        },
      });

      const response = await this.client.send(command);

      console.log(
        `SMS sent successfully to ${params.phoneNumber.slice(-4)} - MessageId: ${response.MessageId}`
      );

      return {
        success: true,
        messageId: response.MessageId,
        estimatedCost,
      };
    } catch (error: any) {
      console.error(`SMS failed for ${params.phoneNumber.slice(-4)}:`, error.message);

      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  async sendBulkSMS(
    recipients: string[],
    message: string,
    smsType?: 'Promotional' | 'Transactional'
  ): Promise<{ results: SMSResult[]; totalCost: number }> {
    const results: SMSResult[] = [];
    let totalCost = 0;

    for (const phoneNumber of recipients) {
      const result = await this.sendSMS({
        phoneNumber,
        message,
        smsType,
      });

      results.push({
        ...result,
        estimatedCost: result.estimatedCost || 0,
      });

      if (result.success && result.estimatedCost) {
        totalCost += result.estimatedCost;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { results, totalCost };
  }

  destroy(): void {
    this.client.destroy();
    this.rateLimiter.clear();
  }
}

export async function createSMSService(config: SMSConfig): Promise<SMSService> {
  const service = new SMSService(config);
  await service.configureSMS();
  return service;
}
