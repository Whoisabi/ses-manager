import type { Express, Request, Response } from "express";
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
  insertEmailCampaignSchema 
} from "@shared/schema";
import { z } from "zod";
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const upload = multer({ storage: multer.memoryStorage() });

// Request schemas
const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  content: z.string().min(1),
});

const sendBulkEmailSchema = z.object({
  subject: z.string().min(1),
  content: z.string().min(1),
  recipientListId: z.string(),
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
      console.error("Error saving AWS credentials:", error);
      res.status(500).json({ message: "Failed to save AWS credentials" });
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

  // Email sending routes
  app.post('/api/email/send', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const data = sendEmailSchema.parse(req.body);
      
      const messageId = await emailService.sendSingleEmail(userId, data);
      
      res.json({ 
        success: true, 
        messageId,
        message: "Email sent successfully" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error sending email:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to send email" });
    }
  });

  app.post('/api/email/send-bulk', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const data = sendBulkEmailSchema.parse(req.body);
      
      await emailService.sendBulkEmail(userId, data);
      
      res.json({ 
        success: true,
        message: "Bulk email campaign started successfully" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error sending bulk email:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to send bulk email" });
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

  // SNS webhook endpoint for SES notifications (public)
  app.post('/api/sns/notifications', async (req: Request, res: Response) => {
    try {
      const notification = req.body;
      
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
