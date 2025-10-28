import { SESClient, SendEmailCommand, SendBulkTemplatedEmailCommand, CreateTemplateCommand, DeleteTemplateCommand, ListTemplatesCommand, ListIdentitiesCommand, GetIdentityVerificationAttributesCommand, VerifyDomainIdentityCommand, VerifyEmailIdentityCommand, VerifyDomainDkimCommand, DeleteIdentityCommand, GetSendQuotaCommand, GetIdentityDkimAttributesCommand, CreateConfigurationSetCommand, DeleteConfigurationSetCommand, ListConfigurationSetsCommand, UpdateConfigurationSetTrackingOptionsCommand, CreateConfigurationSetEventDestinationCommand } from '@aws-sdk/client-ses';
import { SNSClient, PublishCommand, SetSMSAttributesCommand, GetSMSAttributesCommand } from '@aws-sdk/client-sns';
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
  configurationSetName?: string;
}

export interface SendBulkEmailOptions {
  templateName: string;
  from: string;
  destinations: Array<{
    email: string;
    templateData: Record<string, string>;
  }>;
}

export interface SendSMSOptions {
  phoneNumber: string;
  message: string;
  senderID?: string;
}

export class AWSService {
  private sesClient: SESClient | null = null;
  private snsClient: SNSClient | null = null;

  async initialize(userId: string): Promise<void> {
    const credentials = await storage.getAwsCredentials(userId);
    if (!credentials) {
      throw new Error('AWS credentials not configured. Please go to Settings to add your AWS access keys, secret keys, and region. You also need to verify your sending email address in AWS SES.');
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

      this.snsClient = new SNSClient({
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

  private ensureSNSInitialized(): SNSClient {
    if (!this.snsClient) {
      throw new Error('AWS SNS service not initialized. Call initialize() first.');
    }
    return this.snsClient;
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

    // Validate that 'from' email is provided
    const fromEmail = options.from || process.env.AWS_SES_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error('From email address is required. Please provide a verified sender email address.');
    }

    // Validate that the sender email is verified in AWS SES
    await this.validateSenderIdentity(fromEmail);

    const command = new SendEmailCommand({
      Source: fromEmail,
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
      ...(options.configurationSetName && {
        ConfigurationSetName: options.configurationSetName,
      }),
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

  async validateSenderIdentity(email: string): Promise<void> {
    const sesClient = this.ensureInitialized();

    try {
      // Extract domain from email for domain-level verification check
      const domain = email.split('@')[1];
      const identities = [email];
      
      // Also check the domain if it's different from the email
      if (domain && !identities.includes(domain)) {
        identities.push(domain);
      }

      // Get verification attributes for both email and domain
      const command = new GetIdentityVerificationAttributesCommand({
        Identities: identities
      });
      
      const response = await sesClient.send(command);
      
      if (!response.VerificationAttributes) {
        throw new Error(`Email address "${email}" is not verified in AWS SES. Please verify your sender email address or domain "${domain}" in the AWS SES console before sending emails.`);
      }
      
      // Check if either the exact email OR the domain is verified
      const emailVerification = response.VerificationAttributes[email];
      const domainVerification = response.VerificationAttributes[domain];
      
      const isEmailVerified = emailVerification?.VerificationStatus === 'Success';
      const isDomainVerified = domainVerification?.VerificationStatus === 'Success';
      
      if (!isEmailVerified && !isDomainVerified) {
        throw new Error(`Email address "${email}" and domain "${domain}" are not verified in AWS SES. Please verify either your sender email address or domain in the AWS SES console before sending emails.`);
      }
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unable to verify sender email address "${email}". Please check your AWS SES configuration.`);
    }
  }

  async getVerifiedIdentities(): Promise<string[]> {
    const sesClient = this.ensureInitialized();

    try {
      // First, list all identities
      const listCommand = new ListIdentitiesCommand({});
      const listResponse = await sesClient.send(listCommand);
      
      const allIdentities = listResponse.Identities || [];
      
      if (allIdentities.length === 0) {
        return [];
      }

      // Then, get verification attributes for all identities
      const verificationCommand = new GetIdentityVerificationAttributesCommand({
        Identities: allIdentities
      });
      
      const verificationResponse = await sesClient.send(verificationCommand);
      
      // Filter to only return verified identities
      const verifiedIdentities: string[] = [];
      
      for (const identity of allIdentities) {
        const verificationStatus = verificationResponse.VerificationAttributes?.[identity];
        if (verificationStatus?.VerificationStatus === 'Success') {
          verifiedIdentities.push(identity);
        }
      }
      
      return verifiedIdentities;
    } catch (error) {
      console.error('Failed to list verified identities:', error);
      return [];
    }
  }

  async verifyDomainIdentity(domain: string): Promise<{ verificationToken: string; dkimTokens: string[] }> {
    const sesClient = this.ensureInitialized();
    
    const verifyCommand = new VerifyDomainIdentityCommand({
      Domain: domain
    });
    
    const verifyResponse = await sesClient.send(verifyCommand);
    
    const dkimCommand = new VerifyDomainDkimCommand({
      Domain: domain
    });
    
    const dkimResponse = await sesClient.send(dkimCommand);
    
    return {
      verificationToken: verifyResponse.VerificationToken!,
      dkimTokens: dkimResponse.DkimTokens || []
    };
  }

  async verifyEmailIdentity(email: string): Promise<void> {
    const sesClient = this.ensureInitialized();
    
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email
    });
    
    await sesClient.send(command);
  }

  async getDomainDkimTokens(domain: string): Promise<string[]> {
    const sesClient = this.ensureInitialized();
    
    const command = new GetIdentityDkimAttributesCommand({
      Identities: [domain]
    });
    
    const response = await sesClient.send(command);
    const dkimAttributes = response.DkimAttributes?.[domain];
    return dkimAttributes?.DkimTokens || [];
  }

  async getAllIdentitiesWithStatus(): Promise<Array<{
    identity: string;
    type: 'email' | 'domain';
    status: string;
    verificationToken?: string;
    dkimTokens?: string[];
  }>> {
    const sesClient = this.ensureInitialized();

    try {
      const listCommand = new ListIdentitiesCommand({});
      const listResponse = await sesClient.send(listCommand);
      
      const allIdentities = listResponse.Identities || [];
      
      if (allIdentities.length === 0) {
        return [];
      }

      const verificationCommand = new GetIdentityVerificationAttributesCommand({
        Identities: allIdentities
      });
      
      const verificationResponse = await sesClient.send(verificationCommand);
      
      const results = [];
      
      for (const identity of allIdentities) {
        const verificationStatus = verificationResponse.VerificationAttributes?.[identity];
        const type = identity.includes('@') ? 'email' : 'domain';
        
        const result: any = {
          identity,
          type,
          status: verificationStatus?.VerificationStatus || 'Pending'
        };

        if (type === 'domain' && verificationStatus?.VerificationToken) {
          result.verificationToken = verificationStatus.VerificationToken;
        }

        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Failed to get identities with status:', error);
      return [];
    }
  }

  async deleteIdentity(identity: string): Promise<void> {
    const sesClient = this.ensureInitialized();
    
    const command = new DeleteIdentityCommand({
      Identity: identity
    });
    
    await sesClient.send(command);
  }

  async getSendingQuota(): Promise<{
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  }> {
    const sesClient = this.ensureInitialized();
    
    const command = new GetSendQuotaCommand({});
    const response = await sesClient.send(command);
    
    return {
      max24HourSend: response.Max24HourSend || 0,
      maxSendRate: response.MaxSendRate || 0,
      sentLast24Hours: response.SentLast24Hours || 0
    };
  }

  // Helper method to generate DKIM CNAME records from tokens
  generateDkimRecords(domain: string, dkimTokens: string[]): Array<{
    recordType: 'CNAME';
    recordName: string;
    recordValue: string;
    purpose: 'dkim';
  }> {
    return dkimTokens.map(token => ({
      recordType: 'CNAME' as const,
      recordName: `${token}._domainkey.${domain}`,
      recordValue: `${token}.dkim.amazonses.com`,
      purpose: 'dkim' as const,
    }));
  }

  // Helper method to generate DMARC TXT record
  generateDmarcRecord(domain: string): {
    recordType: 'TXT';
    recordName: string;
    recordValue: string;
    purpose: 'dmarc';
  } {
    return {
      recordType: 'TXT' as const,
      recordName: `_dmarc.${domain}`,
      recordValue: 'v=DMARC1; p=none;',
      purpose: 'dmarc' as const,
    };
  }

  // Helper method to generate verification TXT record
  generateVerificationRecord(domain: string, verificationToken: string): {
    recordType: 'TXT';
    recordName: string;
    recordValue: string;
    purpose: 'verification';
  } {
    return {
      recordType: 'TXT' as const,
      recordName: `_amazonses.${domain}`,
      recordValue: verificationToken,
      purpose: 'verification' as const,
    };
  }

  async createConfigurationSet(name: string, snsTopicArn?: string, openTracking = true, clickTracking = true): Promise<void> {
    const sesClient = this.ensureInitialized();

    const createCommand = new CreateConfigurationSetCommand({
      ConfigurationSet: {
        Name: name,
      },
    });

    await sesClient.send(createCommand);

    if (snsTopicArn) {
      const eventTypes: string[] = ['bounce', 'complaint', 'delivery', 'send', 'reject'];
      
      if (openTracking) {
        eventTypes.push('open');
      }
      
      if (clickTracking) {
        eventTypes.push('click');
      }

      const eventCommand = new CreateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: name,
        EventDestination: {
          Name: `${name}-events`,
          Enabled: true,
          MatchingEventTypes: eventTypes,
          SNSDestination: {
            TopicARN: snsTopicArn,
          },
        },
      });

      await sesClient.send(eventCommand);
    }
  }

  async listConfigurationSets(): Promise<string[]> {
    const sesClient = this.ensureInitialized();

    const command = new ListConfigurationSetsCommand({});
    const response = await sesClient.send(command);

    return response.ConfigurationSets?.map(cs => cs.Name).filter(Boolean) as string[] || [];
  }

  async deleteConfigurationSet(name: string): Promise<void> {
    const sesClient = this.ensureInitialized();

    const command = new DeleteConfigurationSetCommand({
      ConfigurationSetName: name,
    });

    await sesClient.send(command);
  }

  async sendSMS(options: SendSMSOptions): Promise<string> {
    const snsClient = this.ensureSNSInitialized();

    const params: any = {
      PhoneNumber: options.phoneNumber,
      Message: options.message,
    };

    if (options.senderID) {
      params.MessageAttributes = {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: options.senderID,
        },
      };
    }

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);
    return response.MessageId!;
  }

  async setSMSAttributes(attributes: { [key: string]: string }): Promise<void> {
    const snsClient = this.ensureSNSInitialized();

    const command = new SetSMSAttributesCommand({
      attributes,
    });

    await snsClient.send(command);
  }

  async getSMSAttributes(): Promise<{ [key: string]: string }> {
    const snsClient = this.ensureSNSInitialized();

    const command = new GetSMSAttributesCommand({});
    const response = await snsClient.send(command);
    return response.attributes || {};
  }
}

export const awsService = new AWSService();
