import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { awsService } from "./services/awsService";
import { emailService } from "./services/emailService";
import { encrypt } from "./services/encryptionService";
import { 
  insertAwsCredentialsSchema,
  insertEmailTemplateSchema,
  insertRecipientListSchema,
  insertEmailCampaignSchema,
  type TrackingConfig,
  type InsertTrackingConfig
} from "@shared/types";
import { snsService } from "./services/snsService";
import { z } from "zod";
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
// @ts-ignore - sns-validator doesn't have type definitions
import MessageValidator from 'sns-validator';

const upload = multer({ storage: multer.memoryStorage() });

// Request schemas
const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  content: z.string().min(1),
  from: z.string().email(),
  configurationSetName: z.string().optional(),
});

const sendBulkEmailSchema = z.object({
  subject: z.string().min(1),
  content: z.string().min(1),
  recipientListId: z.string(),
  from: z.string().email(),
  configurationSetName: z.string().optional(),
});

const validateAwsCredentialsSchema = z.object({
  region: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
});

interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Based on blueprint:javascript_auth_all_persistance - Set up email/password authentication
  setupAuth(app);

  // Middleware to ensure user is authenticated
  const isAuthenticated = (req: AuthenticatedRequest, res: Response, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // AWS Credentials routes
  app.get('/api/aws/credentials', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
  const userId = req.user!.id;
  const credentials = await storage.getAwsCredentials(userId);
      
      if (!credentials) {
        return res.json({ connected: false });
      }

      res.json({
        connected: true,
        region: credentials.region,
        // Never send encrypted keys to frontend
      });
    } catch (error) {
      console.error("Error fetching AWS credentials:", error);
      res.status(500).json({ message: "Failed to fetch AWS credentials" });
    }
  });

  app.post('/api/aws/credentials/validate', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = validateAwsCredentialsSchema.parse(req.body);
      const isValid = await awsService.validateCredentials(validation);
      
      res.json({ valid: isValid });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error validating AWS credentials:", error);
      res.status(500).json({ message: "Failed to validate AWS credentials" });
    }
  });

  app.post('/api/aws/credentials', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const data = insertAwsCredentialsSchema.parse(req.body);

      // Validate credentials first
      const isValid = await awsService.validateCredentials({
        region: data.region,
        accessKeyId: data.encryptedAccessKey, // These are not encrypted yet
        secretAccessKey: data.encryptedSecretKey,
      });

      if (!isValid) {
        return res.status(400).json({ message: "Invalid AWS credentials" });
      }

      // Encrypt the credentials
      const encryptedCredentials = {
        ...data,
        userId,
        encryptedAccessKey: encrypt(data.encryptedAccessKey),
        encryptedSecretKey: encrypt(data.encryptedSecretKey),
      };

      const credentials = await storage.upsertAwsCredentials(encryptedCredentials);

      res.json({
        connected: true,
        region: credentials.region,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Failed to save AWS credentials:", error);
  res.status(500).json({ message: "Failed to save AWS credentials", error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error) });
    }
  });

  app.delete('/api/aws/credentials', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      await storage.deleteAwsCredentials(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AWS credentials:", error);
      res.status(500).json({ message: "Failed to delete AWS credentials" });
    }
  });

  // Get verified sender identities from AWS SES
  app.get('/api/aws/verified-identities', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      await awsService.initialize(userId);
      const identities = await awsService.getVerifiedIdentities();
      res.json({ identities });
    } catch (error) {
      console.error("Error fetching verified identities:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch verified identities";
      
      if (errorMessage.includes('AWS credentials not configured')) {
        return res.status(400).json({ 
          message: errorMessage,
          code: 'MISSING_AWS_CREDENTIALS',
          identities: []
        });
      }
      
      res.status(500).json({ 
        message: errorMessage,
        identities: []
      });
    }
  });

  // SES Identity Management routes
  app.get('/api/ses/identities', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      await awsService.initialize(userId);
      const identities = await awsService.getAllIdentitiesWithStatus();
      
      // Enrich domain identities with database information and DNS records
      const enrichedIdentities = await Promise.all(
        identities.map(async (identity) => {
          if (identity.type === 'domain') {
            const domainRecord = await storage.getDomainByName(identity.identity, userId);
            if (domainRecord) {
              const dnsRecords = await storage.getDnsRecords(domainRecord.id);
              return {
                ...identity,
                verified: identity.status === 'Success',
                domainId: domainRecord.id,
                dnsRecords,
              };
            }
          }
          return {
            ...identity,
            verified: identity.status === 'Success',
          };
        })
      );
      
      // Prevent browser caching to ensure fresh data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json({ identities: enrichedIdentities });
    } catch (error) {
      console.error("Error fetching SES identities:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch identities";
      res.status(500).json({ message: errorMessage, identities: [] });
    }
  });

  app.post('/api/ses/domains', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { domain } = req.body;
      
      if (!domain) {
        return res.status(400).json({ message: "Domain is required" });
      }

      // Check if domain already exists
      const existingDomain = await storage.getDomainByName(domain, userId);
      if (existingDomain) {
        return res.status(400).json({ message: "Domain already exists" });
      }

      await awsService.initialize(userId);
      const result = await awsService.verifyDomainIdentity(domain);
      
      // Save domain to database
      const savedDomain = await storage.createDomain({
        userId,
        domain,
        status: 'pending',
        verificationToken: result.verificationToken,
      });

      // Generate DNS records
      const dkimRecords = awsService.generateDkimRecords(domain, result.dkimTokens);
      const dmarcRecord = awsService.generateDmarcRecord(domain);
      const verificationRecord = awsService.generateVerificationRecord(domain, result.verificationToken);

      // Save DNS records to database
      const allRecords = [
        verificationRecord,
        dmarcRecord,
        ...dkimRecords,
      ];

      const dnsRecords = await storage.createDnsRecords(
        allRecords.map(record => ({
          domainId: savedDomain.id,
          recordType: record.recordType,
          recordName: record.recordName,
          recordValue: record.recordValue,
          purpose: record.purpose,
        }))
      );
      
      res.json({ 
        success: true, 
        domain: savedDomain,
        dnsRecords,
      });
    } catch (error) {
      console.error("Error verifying domain:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to verify domain";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  app.post('/api/ses/emails', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      await awsService.initialize(userId);
      await awsService.verifyEmailIdentity(email);
      
      res.json({ 
        success: true, 
        message: `Verification email sent to ${email}. Please check your inbox and click the verification link.`,
        email
      });
    } catch (error) {
      console.error("Error verifying email:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to verify email";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  app.get('/api/ses/domains/:domain/dkim', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { domain } = req.params;

      await awsService.initialize(userId);
      const dkimTokens = await awsService.getDomainDkimTokens(domain);
      
      res.json({ dkimTokens });
    } catch (error) {
      console.error("Error getting DKIM tokens:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get DKIM tokens";
      res.status(500).json({ message: errorMessage, dkimTokens: [] });
    }
  });

  app.delete('/api/ses/identities/:identity', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { identity } = req.params;

      await awsService.initialize(userId);
      await awsService.deleteIdentity(identity);
      
      // If it's a domain (not an email), also delete from our database
      if (!identity.includes('@')) {
        const domain = await storage.getDomainByName(identity, userId);
        if (domain) {
          await storage.deleteDomain(domain.id, userId);
        }
      }
      
      res.json({ success: true, message: `Identity ${identity} deleted successfully` });
    } catch (error) {
      console.error("Error deleting identity:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete identity";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  app.get('/api/ses/quota', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      await awsService.initialize(userId);
      const quota = await awsService.getSendingQuota();
      
      res.json(quota);
    } catch (error) {
      console.error("Error getting sending quota:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get sending quota";
      res.status(500).json({ message: errorMessage });
    }
  });

  app.post('/api/ses/send-test', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { to, from } = req.body;
      
      if (!to || !from) {
        return res.status(400).json({ message: "Both 'to' and 'from' email addresses are required" });
      }

      const messageId = await emailService.sendSingleEmail(userId, {
        to,
        from,
        subject: 'Test Email from SES Manager',
        content: '<h1>Test Email</h1><p>This is a test email sent from SES Manager. If you received this, your AWS SES configuration is working correctly!</p>',
      });
      
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        messageId 
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send test email";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  // Configuration Set routes
  app.get('/api/ses/configuration-sets', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      await awsService.initialize(userId);

      const awsConfigSets = await awsService.listConfigurationSets();
      const dbConfigSets = await storage.getConfigurationSets(userId);

      const configSets = awsConfigSets.map(name => {
        const dbConfig = dbConfigSets.find(cs => cs.name === name);
        return {
          name,
          snsTopicArn: dbConfig?.snsTopicArn,
          openTrackingEnabled: dbConfig?.openTrackingEnabled ?? true,
          clickTrackingEnabled: dbConfig?.clickTrackingEnabled ?? true,
          createdAt: dbConfig?.createdAt,
          id: dbConfig?.id,
        };
      });

      res.json(configSets);
    } catch (error) {
      console.error("Error listing configuration sets:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to list configuration sets";
      res.status(500).json({ message: errorMessage });
    }
  });

  app.post('/api/ses/configuration-sets', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { name, openTrackingEnabled = true, clickTrackingEnabled = true } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Configuration set name is required" });
      }

      // Initialize AWS and SNS services
      await awsService.initialize(userId);
      await snsService.initialize(userId);

      // Auto-create or find 'ses-tracking' SNS topic
      let snsTopicArn = await snsService.findTopicByName('ses-tracking');
      
      if (!snsTopicArn) {
        console.log('Creating new ses-tracking SNS topic...');
        snsTopicArn = await snsService.createTopic('ses-tracking');
      } else {
        console.log('Using existing ses-tracking SNS topic:', snsTopicArn);
      }

      // Auto-subscribe webhook to the topic
      const webhookUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/api/sns/notifications`;
      
      try {
        await snsService.subscribeTopic(snsTopicArn, webhookUrl);
        console.log('Webhook subscribed to SNS topic:', webhookUrl);
      } catch (error) {
        // Subscription might already exist, which is fine
        console.log('Webhook subscription note:', error instanceof Error ? error.message : 'Already subscribed');
      }

      // Create configuration set with the auto-created SNS topic
      await awsService.createConfigurationSet(name, snsTopicArn, openTrackingEnabled, clickTrackingEnabled);

      const configSet = await storage.createConfigurationSet({
        userId,
        name,
        snsTopicArn,
        openTrackingEnabled,
        clickTrackingEnabled,
      });

      res.json({ success: true, configSet });
    } catch (error) {
      console.error("Error creating configuration set:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create configuration set";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  app.delete('/api/ses/configuration-sets/:name', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { name } = req.params;

      await awsService.initialize(userId);
      await awsService.deleteConfigurationSet(name);

      await storage.deleteConfigurationSet(name, userId);

      res.json({ success: true, message: `Configuration set ${name} deleted successfully` });
    } catch (error) {
      console.error("Error deleting configuration set:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete configuration set";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  // Email sending routes
  app.post('/api/email/send', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const data = sendEmailSchema.parse(req.body);
      const messageId = await emailService.sendSingleEmail(userId, data);
      res.json({ success: true, messageId });
    } catch (error) {
      console.error("Error sending email:", error);
      
      // Return more specific error messages to help users
      const errorMessage = error instanceof Error ? error.message : "Failed to send email";
      
      // Determine appropriate HTTP status code based on error type
      if (errorMessage.includes('AWS credentials not configured')) {
        return res.status(400).json({ 
          success: false, 
          message: errorMessage,
          code: 'MISSING_AWS_CREDENTIALS' 
        });
      }
      
      if (errorMessage.includes('From email address is required')) {
        return res.status(400).json({ 
          success: false, 
          message: errorMessage,
          code: 'MISSING_FROM_EMAIL' 
        });
      }
      
      if (errorMessage.includes('not verified') || errorMessage.includes('not authorized')) {
        return res.status(400).json({ 
          success: false, 
          message: errorMessage,
          code: 'SENDER_NOT_VERIFIED' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage,
        code: 'SEND_FAILED'
      });
    }
  });

  // Bulk email sending route with error aggregation
  app.post('/api/email/send-bulk', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const data = sendBulkEmailSchema.parse(req.body);
      // campaignId can be passed optionally from frontend
      const campaignId = req.body.campaignId || null;
      let failed = 0;
      let sent = 0;
      let total = 0;
      let failedEmails: string[] = [];
      let sentEmails: string[] = [];
      const recipients = await storage.getRecipients(data.recipientListId, userId);
      total = recipients.length;
      if (total === 0) {
        return res.status(400).json({ success: false, message: "No recipients found in the selected list" });
      }
      for (const recipient of recipients) {
        if (!recipient.isActive) continue;
        try {
          await emailService.sendSingleEmail(userId, {
            to: recipient.email,
            subject: data.subject,
            content: data.content,
            campaignId,
            from: data.from,
            configurationSetName: data.configurationSetName,
          });
          sent++;
          sentEmails.push(recipient.email);
        } catch (err) {
          failed++;
          failedEmails.push(recipient.email);
        }
      }
      let message = `Sent: ${sent}, Failed: ${failed}, Total: ${total}`;
      if (sent === 0) {
        return res.status(500).json({ success: false, message: "All emails failed to send", failedEmails });
      }
      if (failed > 0) {
        return res.status(207).json({ success: false, message, sentEmails, failedEmails });
      }
      res.json({ success: true, message });
    } catch (error) {
      console.error("Error sending bulk email:", error);
      res.status(500).json({ success: false, message: "Failed to send bulk email", error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error) });
    }
  });
  // Email templates routes
  app.get('/api/templates', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const templates = await storage.getEmailTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post('/api/templates', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const data = insertEmailTemplateSchema.parse(req.body);
      
      const template = await storage.createEmailTemplate({ ...data, userId });
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put('/api/templates/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const templateId = req.params.id;
      const data = insertEmailTemplateSchema.partial().parse(req.body);
      
      const template = await storage.updateEmailTemplate(templateId, userId, data);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete('/api/templates/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const templateId = req.params.id;
      
      await storage.deleteEmailTemplate(templateId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Recipient lists routes
  app.get('/api/recipient-lists', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const lists = await storage.getRecipientLists(userId);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching recipient lists:", error);
      res.status(500).json({ message: "Failed to fetch recipient lists" });
    }
  });

  app.post('/api/recipient-lists', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const data = insertRecipientListSchema.parse(req.body);
      
      const list = await storage.createRecipientList({ ...data, userId });
      res.json(list);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating recipient list:", error);
      res.status(500).json({ message: "Failed to create recipient list" });
    }
  });

  app.get('/api/recipient-lists/:id/recipients', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const listId = req.params.id;
      
      const recipients = await storage.getRecipients(listId, userId);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      res.status(500).json({ message: "Failed to fetch recipients" });
    }
  });

  app.post('/api/recipient-lists/:id/upload', isAuthenticated, upload.single('csv'), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const listId = req.params.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      // Verify the list belongs to the user
      const list = await storage.getRecipientList(listId, userId);
      if (!list) {
        return res.status(404).json({ message: "Recipient list not found" });
      }

      // Parse CSV
      const recipients: any[] = [];
      const csvStream = Readable.from(req.file.buffer);
      
      await new Promise((resolve, reject) => {
        csvStream
          .pipe(csvParser())
          .on('data', (data) => {
            if (data.email) {
              recipients.push({
                listId,
                email: data.email,
                firstName: data.firstName || data.first_name || null,
                lastName: data.lastName || data.last_name || null,
                metadata: Object.keys(data).reduce((acc, key) => {
                  if (!['email', 'firstName', 'first_name', 'lastName', 'last_name'].includes(key)) {
                    acc[key] = data[key];
                  }
                  return acc;
                }, {} as Record<string, any>),
              });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No valid recipients found in CSV file" });
      }

      // Clear existing recipients and add new ones
      await storage.deleteRecipients(listId);
      const createdRecipients = await storage.createRecipients(recipients);
      
      res.json({ 
        success: true, 
        count: createdRecipients.length,
        message: `Successfully imported ${createdRecipients.length} recipients` 
      });
    } catch (error) {
      console.error("Error uploading recipients:", error);
      res.status(500).json({ message: "Failed to upload recipients" });
    }
  });

  // Email campaigns routes
  app.get('/api/campaigns', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const campaigns = await storage.getEmailCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const data = insertEmailCampaignSchema.parse(req.body);
      
      const campaign = await storage.createEmailCampaign({ ...data, userId });
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Email tracking routes
  app.get('/api/email-sends', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const emailSends = await storage.getEmailSends(userId, limit);
      res.json(emailSends);
    } catch (error) {
      console.error("Error fetching email sends:", error);
      res.status(500).json({ message: "Failed to fetch email sends" });
    }
  });

  app.get('/api/analytics/stats', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getEmailStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching email stats:", error);
      res.status(500).json({ message: "Failed to fetch email stats" });
    }
  });

  app.get('/api/analytics/timeseries', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const campaignId = req.query.campaignId as string | undefined;
      
      const timeseries = await storage.getEmailTimeSeriesData(userId, days, campaignId);
      res.json(timeseries);
    } catch (error) {
      console.error("Error fetching time series data:", error);
      res.status(500).json({ message: "Failed to fetch time series data" });
    }
  });

  // Tracking pixel endpoint (public)
  app.get('/api/tracking/pixel/:trackingId', async (req: Request, res: Response) => {
    try {
      const trackingId = req.params.trackingId;
      const emailSend = await storage.getEmailSendByTrackingPixel(trackingId);
      
      if (emailSend && !emailSend.openedAt) {
        await storage.updateEmailSend(emailSend.id, { openedAt: new Date() });
        await storage.createTrackingEvent({
          emailSendId: emailSend.id,
          eventType: 'open',
          eventData: {
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          },
        });
      }

      // Return a 1x1 transparent pixel
      const pixel = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
        0x04, 0x01, 0x00, 0x3B
      ]);

      res.set({
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.send(pixel);
    } catch (error) {
      console.error("Error tracking email open:", error);
      res.status(500).send('Error');
    }
  });

  // Click tracking endpoint (public)
  app.get('/api/tracking/click/:emailSendId', async (req: Request, res: Response) => {
    try {
      const emailSendId = req.params.emailSendId;
      const targetUrl = req.query.url as string;

      if (!targetUrl) {
        return res.status(400).send('Missing target URL');
      }

      // Update email send record if not already clicked
      const emailSend = await storage.getEmailSend(emailSendId);
      if (emailSend && !emailSend.clickedAt) {
        await storage.updateEmailSend(emailSend.id, { clickedAt: new Date() });
        await storage.createTrackingEvent({
          emailSendId: emailSend.id,
          eventType: 'click',
          eventData: {
            url: targetUrl,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          },
        });
      }

      // Redirect to target URL
      res.redirect(decodeURIComponent(targetUrl));
    } catch (error) {
      console.error("Error tracking click:", error);
      res.status(500).send('Error');
    }
  });

  // SNS webhook endpoint (public - receives SNS notifications)
  app.post('/api/sns/notifications', express.raw({ type: 'text/plain' }), async (req: Request, res: Response) => {
    let webhookLogId: string | undefined;
    
    try {
      const body = req.body.toString();
      const message = JSON.parse(body);

      console.log('📨 SNS notification received:', message.Type);

      // Log webhook message to database for debugging
      let notification: any = null;
      let eventType: string | null = null;
      let emailMessageId: string | null = null;
      let recipientEmail: string | null = null;

      try {
        if (message.Type === 'Notification' && message.Message) {
          notification = JSON.parse(message.Message);
          eventType = notification.eventType || notification.notificationType;
          emailMessageId = notification.mail?.messageId;
          
          // Extract recipient email based on event type
          if (notification.bounce?.bouncedRecipients?.[0]?.emailAddress) {
            recipientEmail = notification.bounce.bouncedRecipients[0].emailAddress;
          } else if (notification.complaint?.complainedRecipients?.[0]?.emailAddress) {
            recipientEmail = notification.complaint.complainedRecipients[0].emailAddress;
          } else if (notification.delivery?.recipients?.[0]) {
            recipientEmail = notification.delivery.recipients[0];
          } else if (notification.mail?.destination?.[0]) {
            recipientEmail = notification.mail.destination[0];
          }
        }
      } catch (e) {
        // Non-JSON message, will be logged with raw payload
      }

      const webhookLog = await storage.createWebhookLog({
        messageType: message.Type,
        messageId: message.MessageId,
        topicArn: message.TopicArn,
        eventType,
        emailMessageId,
        recipientEmail,
        processingStatus: 'received',
        rawPayload: message,
      });
      
      webhookLogId = webhookLog.id;
      console.log(`📝 Webhook logged with ID: ${webhookLogId}`);

      // Validate SNS message signature
      const validator = new MessageValidator();

      await new Promise((resolve, reject) => {
        validator.validate(message, (err: Error | null, validatedMessage: any) => {
          if (err) {
            console.error('❌ SNS signature validation failed:', err);
            reject(err);
          } else {
            resolve(validatedMessage);
          }
        });
      });

      console.log('✅ SNS signature validated successfully');
      await storage.updateWebhookLog(webhookLogId, { processingStatus: 'validated' });

      // Handle subscription confirmation
      if (message.Type === 'SubscriptionConfirmation') {
        console.log('🔗 Confirming SNS subscription:', message.SubscribeURL);
        
        // Fetch the subscription URL to confirm
        const https = await import('https');
        https.get(message.SubscribeURL, (response) => {
          console.log('✅ Subscription confirmed:', response.statusCode);
        });

        await storage.updateWebhookLog(webhookLogId, { processingStatus: 'subscription_confirmed' });
        return res.status(200).send('Subscription confirmed');
      }

      // Handle notifications
      if (message.Type === 'Notification') {
        // Try to parse message as JSON, if it fails it's likely a test notification
        if (!notification) {
          console.log('⚠️  SNS test/non-JSON notification received:', message.Message);
          await storage.updateWebhookLog(webhookLogId, { 
            processingStatus: 'test_notification',
            errorMessage: 'Non-JSON message content' 
          });
          return res.status(200).send('Test notification received');
        }
        
        console.log(`📧 SNS Event: ${eventType} for messageId: ${emailMessageId}`);
        console.log(`📧 Recipient: ${recipientEmail || 'unknown'}`);
        console.log(`📧 Full notification data:`, JSON.stringify(notification, null, 2));

        if (!emailMessageId) {
          console.log('⚠️  No messageId in notification, skipping');
          await storage.updateWebhookLog(webhookLogId, { 
            processingStatus: 'no_message_id',
            errorMessage: 'Missing email messageId in notification' 
          });
          return res.status(200).send('No messageId found');
        }

        const emailSend = await storage.getEmailSendByMessageId(emailMessageId);
        
        if (!emailSend) {
          console.log(`⚠️  Email send record not found for messageId: ${emailMessageId}`);
          await storage.updateWebhookLog(webhookLogId, { 
            processingStatus: 'email_not_found',
            errorMessage: `No email send record found for messageId: ${emailMessageId}` 
          });
          return res.status(200).send('Email send record not found');
        }

        if (eventType === 'Bounce') {
          await storage.updateEmailSend(emailSend.id, {
            status: 'bounced',
            bouncedAt: new Date(),
            bounceReason: JSON.stringify(notification.bounce),
          });
          
          await storage.createTrackingEvent({
            emailSendId: emailSend.id,
            eventType: 'bounce',
            eventData: notification.bounce,
          });
          await storage.updateWebhookLog(webhookLogId, { processingStatus: 'processed' });
          console.log(`✅ Bounce recorded for email ${emailSend.id}`);
        } else if (eventType === 'Complaint') {
          await storage.updateEmailSend(emailSend.id, {
            status: 'complained',
            complainedAt: new Date(),
            complaintReason: JSON.stringify(notification.complaint),
          });
          
          await storage.createTrackingEvent({
            emailSendId: emailSend.id,
            eventType: 'complaint',
            eventData: notification.complaint,
          });
          await storage.updateWebhookLog(webhookLogId, { processingStatus: 'processed' });
          console.log(`✅ Complaint recorded for email ${emailSend.id}`);
        } else if (eventType === 'Delivery') {
          if (!emailSend.deliveredAt) {
            await storage.updateEmailSend(emailSend.id, {
              status: 'delivered',
              deliveredAt: new Date(),
            });
            
            await storage.createTrackingEvent({
              emailSendId: emailSend.id,
              eventType: 'delivery',
              eventData: notification.delivery,
            });
            await storage.updateWebhookLog(webhookLogId, { processingStatus: 'processed' });
            console.log(`✅ Delivery recorded for email ${emailSend.id}`);
          } else {
            await storage.updateWebhookLog(webhookLogId, { processingStatus: 'already_processed' });
          }
        } else if (eventType === 'Open') {
          if (!emailSend.openedAt) {
            await storage.updateEmailSend(emailSend.id, {
              openedAt: new Date(),
            });
            
            await storage.createTrackingEvent({
              emailSendId: emailSend.id,
              eventType: 'open',
              eventData: notification.open,
            });
            await storage.updateWebhookLog(webhookLogId, { processingStatus: 'processed' });
            console.log(`✅ Open recorded for email ${emailSend.id}`);
          } else {
            await storage.updateWebhookLog(webhookLogId, { processingStatus: 'already_processed' });
          }
        } else if (eventType === 'Click') {
          if (!emailSend.clickedAt) {
            await storage.updateEmailSend(emailSend.id, {
              clickedAt: new Date(),
            });
            
            await storage.createTrackingEvent({
              emailSendId: emailSend.id,
              eventType: 'click',
              eventData: notification.click,
            });
            await storage.updateWebhookLog(webhookLogId, { processingStatus: 'processed' });
            console.log(`✅ Click recorded for email ${emailSend.id}`);
          } else {
            await storage.updateWebhookLog(webhookLogId, { processingStatus: 'already_processed' });
          }
        } else if (eventType === 'Send') {
          // Send event is just confirmation, we already have the record
          await storage.updateWebhookLog(webhookLogId, { processingStatus: 'send_confirmation' });
          console.log(`ℹ️  Send event received for ${emailSend.id}, no action needed`);
        } else {
          await storage.updateWebhookLog(webhookLogId, { 
            processingStatus: 'unknown_event',
            errorMessage: `Unknown event type: ${eventType}` 
          });
          console.log(`⚠️  Unknown event type: ${eventType}`);
        }

        return res.status(200).send('Notification processed');
      }

      await storage.updateWebhookLog(webhookLogId, { processingStatus: 'unknown_type' });
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Error processing SNS notification:', error);
      
      // Update webhook log with error
      if (webhookLogId) {
        try {
          await storage.updateWebhookLog(webhookLogId, { 
            processingStatus: 'error',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        } catch (logError) {
          console.error('Failed to update webhook log:', logError);
        }
      }
      
      // Return 400 for validation errors, 500 for other errors
      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).send('Invalid SNS message signature');
      }
      
      res.status(500).send('Error processing notification');
    }
  });

  // Get DNS records for a domain
  app.get('/api/domains/:domainId/dns-records', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { domainId } = req.params;

      // Verify user owns this domain
      const domain = await storage.getDomain(domainId, userId);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }

      const dnsRecords = await storage.getDnsRecords(domainId);
      res.json({ dnsRecords });
    } catch (error) {
      console.error("Error fetching DNS records:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch DNS records";
      res.status(500).json({ message: errorMessage, dnsRecords: [] });
    }
  });

  // Get bounce and complaint stats
  app.get('/api/bounce-complaint-stats', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { domain } = req.query;

      const stats = await storage.getBounceComplaintStats(userId, domain as string | undefined);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching bounce/complaint stats:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch stats";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Get bounce and complaint events for a domain
  app.get('/api/domains/:domain/bounce-complaint-events', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { domain } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const events = await storage.getBounceComplaintEventsByDomain(userId, domain, limit);
      res.json({ events });
    } catch (error) {
      console.error("Error fetching bounce/complaint events:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch events";
      res.status(500).json({ message: errorMessage, events: [] });
    }
  });

  // Get all domains for a user with DNS records
  app.get('/api/domains', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const domains = await storage.getDomains(userId);
      
      // Fetch DNS records for each domain
      const domainsWithRecords = await Promise.all(
        domains.map(async (domain) => {
          const dnsRecords = await storage.getDnsRecords(domain.id);
          return { ...domain, dnsRecords };
        })
      );
      
      res.json({ domains: domainsWithRecords });
    } catch (error) {
      console.error("Error fetching domains:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch domains";
      res.status(500).json({ message: errorMessage, domains: [] });
    }
  });

  // Get bounce/complaint stats for a specific domain by ID
  app.get('/api/domains/:domainId/bounce-complaint-stats', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { domainId } = req.params;

      // Verify user owns this domain
      const domain = await storage.getDomain(domainId, userId);
      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      }

      // Get stats using the domain name
      const stats = await storage.getBounceComplaintStats(userId, domain.domain);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching bounce/complaint stats:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch stats";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Tracking configuration routes
  app.get('/api/tracking/config', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const config = await storage.getTrackingConfig(userId);
      
      if (!config) {
        return res.json({ 
          isEnabled: false,
          config: null
        });
      }
      
      res.json({
        isEnabled: config.isEnabled,
        config: {
          webhookUrl: config.webhookUrl,
          bounceTopicArn: config.bounceTopicArn,
          complaintTopicArn: config.complaintTopicArn,
          deliveryTopicArn: config.deliveryTopicArn,
        }
      });
    } catch (error) {
      console.error("Error fetching tracking config:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch tracking configuration";
      res.status(500).json({ message: errorMessage });
    }
  });

  app.post('/api/tracking/enable', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Construct webhook URL
      const webhookUrl = `${process.env.REPL_DOMAINS?.split(',')[0] || process.env.BASE_URL || 'http://localhost:5000'}/api/sns/notifications`;

      // Initialize AWS services
      await awsService.initialize(userId);
      await snsService.initialize(userId);

      // Get all verified SES identities
      const identities = await awsService.getVerifiedIdentities();

      if (identities.length === 0) {
        return res.status(400).json({ 
          message: "No verified email identities found. Please verify at least one email address or domain first." 
        });
      }

      // Setup SNS tracking
      const trackingSetup = await snsService.setupTracking(userId, webhookUrl, identities);

      // Store configuration in database
      const config = await storage.upsertTrackingConfig({
        userId,
        isEnabled: true,
        bounceTopicArn: trackingSetup.bounceTopicArn,
        complaintTopicArn: trackingSetup.complaintTopicArn,
        deliveryTopicArn: trackingSetup.deliveryTopicArn,
        bounceSubscriptionArn: trackingSetup.bounceSubscriptionArn,
        complaintSubscriptionArn: trackingSetup.complaintSubscriptionArn,
        deliverySubscriptionArn: trackingSetup.deliverySubscriptionArn,
        webhookUrl,
      });

      res.json({
        success: true,
        webhookUrl,
        config: {
          isEnabled: config.isEnabled,
          bounceTopicArn: config.bounceTopicArn,
          complaintTopicArn: config.complaintTopicArn,
          deliveryTopicArn: config.deliveryTopicArn,
        }
      });
    } catch (error) {
      console.error("Error enabling tracking:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to enable tracking";
      res.status(500).json({ message: errorMessage });
    }
  });

  app.post('/api/tracking/disable', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      // Get tracking config from database
      const config = await storage.getTrackingConfig(userId);
      
      if (!config) {
        return res.status(404).json({ message: "No tracking configuration found" });
      }

      // Initialize AWS services
      await awsService.initialize(userId);
      await snsService.initialize(userId);

      // Get all verified identities
      const identities = await awsService.getVerifiedIdentities();

      // Cleanup SNS resources
      await snsService.cleanupTracking({
        bounceTopicArn: config.bounceTopicArn || undefined,
        complaintTopicArn: config.complaintTopicArn || undefined,
        deliveryTopicArn: config.deliveryTopicArn || undefined,
        bounceSubscriptionArn: config.bounceSubscriptionArn || undefined,
        complaintSubscriptionArn: config.complaintSubscriptionArn || undefined,
        deliverySubscriptionArn: config.deliverySubscriptionArn || undefined,
      }, identities);

      // Update configuration to disabled
      await storage.upsertTrackingConfig({
        userId,
        isEnabled: false,
        bounceTopicArn: null,
        complaintTopicArn: null,
        deliveryTopicArn: null,
        bounceSubscriptionArn: null,
        complaintSubscriptionArn: null,
        deliverySubscriptionArn: null,
        webhookUrl: null,
      });

      res.json({
        success: true,
        message: "Tracking disabled successfully"
      });
    } catch (error) {
      console.error("Error disabling tracking:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to disable tracking";
      res.status(500).json({ message: errorMessage });
    }
  });

  // SNS webhook endpoint for SES notifications (public)
  // AWS SNS sends text/plain content, so we need to parse it manually
  app.post('/api/sns/notifications', express.text({ type: '*/*' }), async (req: Request, res: Response) => {
    try {
      // Parse the SNS message body (AWS sends it as text/plain)
      const notification = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Handle subscription confirmation (required for SNS to work)
      if (notification.Type === 'SubscriptionConfirmation') {
        const subscribeURL = notification.SubscribeURL;
        if (subscribeURL) {
          // Confirm the subscription
          const https = await import('https');
          https.get(subscribeURL, (response) => {
            console.log('SNS subscription confirmed successfully');
          });
        }
        return res.status(200).send('Subscription confirmed');
      }
      
      // Handle unsubscribe confirmation (optional)
      if (notification.Type === 'UnsubscribeConfirmation') {
        return res.status(200).send('Unsubscribe confirmed');
      }
      
      // Handle SES bounce, complaint, and delivery notifications
      if (notification.Type === 'Notification') {
        const message = JSON.parse(notification.Message);
        
        if (message.notificationType === 'Bounce') {
          const messageId = message.mail.commonHeaders.messageId;
          const emailSend = await storage.getEmailSendByMessageId(messageId);
          
          if (emailSend) {
            await storage.updateEmailSend(emailSend.id, {
              status: 'bounced',
              bouncedAt: new Date(),
              bounceReason: message.bounce.bounceType,
            });
            
            await storage.createTrackingEvent({
              emailSendId: emailSend.id,
              eventType: 'bounce',
              eventData: message.bounce,
            });

            // Save to bounce_complaint_events table
            const bounceType = message.bounce.bounceType?.toLowerCase(); // hard, soft, transient
            const recipient = message.bounce.bouncedRecipients?.[0];
            if (recipient) {
              const recipientEmail = recipient.emailAddress;
              const domain = recipientEmail.split('@')[1];
              
              await storage.createBounceComplaintEvent({
                emailSendId: emailSend.id,
                eventType: 'bounce',
                bounceType,
                recipientEmail,
                domain,
                reason: recipient.status || recipient.diagnosticCode,
                diagnosticCode: recipient.diagnosticCode,
                rawData: message.bounce,
              });
            }
          }
        } else if (message.notificationType === 'Complaint') {
          const messageId = message.mail.commonHeaders.messageId;
          const emailSend = await storage.getEmailSendByMessageId(messageId);
          
          if (emailSend) {
            await storage.updateEmailSend(emailSend.id, {
              status: 'complained',
              complainedAt: new Date(),
              complaintReason: message.complaint.complaintFeedbackType,
            });
            
            await storage.createTrackingEvent({
              emailSendId: emailSend.id,
              eventType: 'complaint',
              eventData: message.complaint,
            });

            // Save to bounce_complaint_events table
            const complainedRecipient = message.complaint.complainedRecipients?.[0];
            if (complainedRecipient) {
              const recipientEmail = complainedRecipient.emailAddress;
              const domain = recipientEmail.split('@')[1];
              
              await storage.createBounceComplaintEvent({
                emailSendId: emailSend.id,
                eventType: 'complaint',
                bounceType: null,
                recipientEmail,
                domain,
                reason: message.complaint.complaintFeedbackType,
                diagnosticCode: null,
                rawData: message.complaint,
              });
            }
          }
        } else if (message.notificationType === 'Delivery') {
          const messageId = message.mail.commonHeaders.messageId;
          const emailSend = await storage.getEmailSendByMessageId(messageId);
          
          if (emailSend) {
            await storage.updateEmailSend(emailSend.id, {
              status: 'delivered',
              deliveredAt: new Date(),
            });
            
            await storage.createTrackingEvent({
              emailSendId: emailSend.id,
              eventType: 'delivery',
              eventData: message.delivery,
            });
          }
        } else if (message.notificationType === 'Open') {
          const messageId = message.mail.commonHeaders.messageId;
          const emailSend = await storage.getEmailSendByMessageId(messageId);
          
          if (emailSend && !emailSend.openedAt) {
            await storage.updateEmailSend(emailSend.id, {
              openedAt: new Date(),
            });
            
            await storage.createTrackingEvent({
              emailSendId: emailSend.id,
              eventType: 'open',
              eventData: {
                timestamp: message.open.timestamp,
                userAgent: message.open.userAgent,
                ipAddress: message.open.ipAddress,
              },
            });
          }
        } else if (message.notificationType === 'Click') {
          const messageId = message.mail.commonHeaders.messageId;
          const emailSend = await storage.getEmailSendByMessageId(messageId);
          
          if (emailSend) {
            if (!emailSend.clickedAt) {
              await storage.updateEmailSend(emailSend.id, {
                clickedAt: new Date(),
              });
            }
            
            await storage.createTrackingEvent({
              emailSendId: emailSend.id,
              eventType: 'click',
              eventData: {
                timestamp: message.click.timestamp,
                link: message.click.link,
                linkTags: message.click.linkTags,
                userAgent: message.click.userAgent,
                ipAddress: message.click.ipAddress,
              },
            });
          }
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error("Error processing SNS notification:", error);
      res.status(500).send('Error');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
