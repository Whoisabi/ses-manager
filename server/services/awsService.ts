import { SESClient, SendEmailCommand, SendBulkTemplatedEmailCommand, CreateTemplateCommand, DeleteTemplateCommand, ListTemplatesCommand } from '@aws-sdk/client-ses';
import { storage } from '../storage';
import { decrypt } from './encryptionService';

export interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SendEmailOptions {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string;
}

export interface SendBulkEmailOptions {
  templateName: string;
  from: string;
  destinations: Array<{
    email: string;
    templateData: Record<string, string>;
  }>;
}

export class AWSService {
  private sesClient: SESClient | null = null;

  async initialize(userId: string): Promise<void> {
    const credentials = await storage.getAwsCredentials(userId);
    if (!credentials) {
      throw new Error('AWS credentials not found. Please configure your AWS credentials first.');
    }

    try {
      const accessKeyId = decrypt(credentials.encryptedAccessKey);
      const secretAccessKey = decrypt(credentials.encryptedSecretKey);

      this.sesClient = new SESClient({
        region: credentials.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } catch (error) {
      throw new Error('Failed to decrypt AWS credentials. Please reconfigure your credentials.');
    }
  }

  private ensureInitialized(): SESClient {
    if (!this.sesClient) {
      throw new Error('AWS service not initialized. Call initialize() first.');
    }
    return this.sesClient;
  }

  async validateCredentials(config: AWSConfig): Promise<boolean> {
    try {
      const sesClient = new SESClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });

      // Test the credentials by listing templates
      await sesClient.send(new ListTemplatesCommand({}));
      return true;
    } catch (error) {
      console.error('AWS credentials validation failed:', error);
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<string> {
    const sesClient = this.ensureInitialized();

    const command = new SendEmailCommand({
      Source: options.from || process.env.AWS_SES_FROM_EMAIL || 'noreply@example.com',
      Destination: {
        ToAddresses: options.to,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.htmlBody,
            Charset: 'UTF-8',
          },
          ...(options.textBody && {
            Text: {
              Data: options.textBody,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    });

    const response = await sesClient.send(command);
    return response.MessageId!;
  }

  async sendBulkEmail(options: SendBulkEmailOptions): Promise<string[]> {
    const sesClient = this.ensureInitialized();

    const command = new SendBulkTemplatedEmailCommand({
      Source: options.from,
      Template: options.templateName,
      DefaultTemplateData: JSON.stringify({}),
      Destinations: options.destinations.map(dest => ({
        Destination: {
          ToAddresses: [dest.email],
        },
        ReplacementTemplateData: JSON.stringify(dest.templateData),
      })),
    });

    const response = await sesClient.send(command);
    return response.Status ? response.Status.map((_, i) => `bulk-${i}`) : [];
  }

  async createTemplate(name: string, subject: string, htmlPart: string, textPart?: string): Promise<void> {
    const sesClient = this.ensureInitialized();

    const command = new CreateTemplateCommand({
      Template: {
        TemplateName: name,
        SubjectPart: subject,
        HtmlPart: htmlPart,
        TextPart: textPart,
      },
    });

    await sesClient.send(command);
  }

  async deleteTemplate(name: string): Promise<void> {
    const sesClient = this.ensureInitialized();

    const command = new DeleteTemplateCommand({
      TemplateName: name,
    });

    await sesClient.send(command);
  }
}

export const awsService = new AWSService();
