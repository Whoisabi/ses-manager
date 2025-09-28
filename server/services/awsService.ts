import { SESClient, SendEmailCommand, SendBulkTemplatedEmailCommand, CreateTemplateCommand, DeleteTemplateCommand, ListTemplatesCommand, ListIdentitiesCommand, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';
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
}

export const awsService = new AWSService();
