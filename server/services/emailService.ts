import { storage } from '../storage';
import { awsService } from './awsService';
import { randomUUID } from 'crypto';
import type { InsertEmailSend } from '@shared/schema';

export interface SendSingleEmailRequest {
  to: string;
  subject: string;
  content: string;
  campaignId?: string;
  from?: string;
}

export interface SendBulkEmailRequest {
  subject: string;
  content: string;
  recipientListId: string;
  campaignId?: string;
  from?: string;
}

export class EmailService {
  async sendSingleEmail(userId: string, request: SendSingleEmailRequest): Promise<string> {
    await awsService.initialize(userId);

    // Add tracking pixel to content
    const trackingPixelId = randomUUID();
    const trackingPixel = `<img src="${process.env.BASE_URL || 'http://localhost:5000'}/api/tracking/pixel/${trackingPixelId}" width="1" height="1" style="display:none;" alt="" />`;
    const contentWithTracking = request.content + trackingPixel;

    try {
      const messageId = await awsService.sendEmail({
        to: [request.to],
        subject: request.subject,
        htmlBody: contentWithTracking,
        from: request.from,
      });

      // Record the email send
      const emailSend: InsertEmailSend = {
        campaignId: request.campaignId,
        recipientEmail: request.to,
        subject: request.subject,
        content: request.content,
        status: 'sent',
        messageId,
        trackingPixelId,
        sentAt: new Date(),
      };

      await storage.createEmailSend(emailSend);

      return messageId;
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Record the failed send
      const emailSend: InsertEmailSend = {
        campaignId: request.campaignId,
        recipientEmail: request.to,
        subject: request.subject,
        content: request.content,
        status: 'failed',
        trackingPixelId,
      };

      await storage.createEmailSend(emailSend);
      
      throw new Error('Failed to send email');
    }
  }

  async sendBulkEmail(userId: string, request: SendBulkEmailRequest): Promise<void> {
    await awsService.initialize(userId);

    // Get recipients from the list
    const recipients = await storage.getRecipients(request.recipientListId, userId);
    
    if (recipients.length === 0) {
      throw new Error('No recipients found in the selected list');
    }

    // Process template variables in content
    const emailSends: InsertEmailSend[] = [];

    for (const recipient of recipients) {
      if (!recipient.isActive) continue;

      const trackingPixelId = randomUUID();
      const trackingPixel = `<img src="${process.env.BASE_URL || 'http://localhost:5000'}/api/tracking/pixel/${trackingPixelId}" width="1" height="1" style="display:none;" alt="" />`;
      
      // Replace template variables
      let personalizedContent = request.content;
      let personalizedSubject = request.subject;
      
      if (recipient.firstName) {
        personalizedContent = personalizedContent.replace(/{{firstName}}/g, recipient.firstName);
        personalizedSubject = personalizedSubject.replace(/{{firstName}}/g, recipient.firstName);
      }
      
      if (recipient.lastName) {
        personalizedContent = personalizedContent.replace(/{{lastName}}/g, recipient.lastName);
        personalizedSubject = personalizedSubject.replace(/{{lastName}}/g, recipient.lastName);
      }
      
      if (recipient.email) {
        personalizedContent = personalizedContent.replace(/{{email}}/g, recipient.email);
        personalizedSubject = personalizedSubject.replace(/{{email}}/g, recipient.email);
      }

      // Add metadata variables if available
      if (recipient.metadata && typeof recipient.metadata === 'object') {
        for (const [key, value] of Object.entries(recipient.metadata)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedContent = personalizedContent.replace(regex, String(value));
          personalizedSubject = personalizedSubject.replace(regex, String(value));
        }
      }

      const contentWithTracking = personalizedContent + trackingPixel;

      try {
        const messageId = await awsService.sendEmail({
          to: [recipient.email],
          subject: personalizedSubject,
          htmlBody: contentWithTracking,
        });

        emailSends.push({
          campaignId: request.campaignId,
          recipientEmail: recipient.email,
          subject: personalizedSubject,
          content: personalizedContent,
          status: 'sent',
          messageId,
          trackingPixelId,
          sentAt: new Date(),
        });
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        
        emailSends.push({
          campaignId: request.campaignId,
          recipientEmail: recipient.email,
          subject: personalizedSubject,
          content: personalizedContent,
          status: 'failed',
          trackingPixelId,
        });
      }
    }

    // Batch insert all email sends
    for (const emailSend of emailSends) {
      await storage.createEmailSend(emailSend);
    }
  }

  async processTemplateVariables(content: string, variables: Record<string, string>): Promise<string> {
    let processedContent = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    }
    
    return processedContent;
  }
}

export const emailService = new EmailService();
