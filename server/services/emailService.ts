import { storage } from '../storage';
import { awsService } from './awsService';
import { randomUUID } from 'crypto';
import type { InsertEmailSend } from '@shared/types';

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
  private getBaseUrl(): string {
    // Use REPL_DOMAINS for deployed Replit apps, fallback to BASE_URL or localhost
    const replDomains = process.env.REPL_DOMAINS;
    if (replDomains) {
      const primaryDomain = replDomains.split(',')[0];
      return `https://${primaryDomain}`;
    }
    return process.env.BASE_URL || 'http://localhost:5000';
  }

  private addClickTracking(content: string, emailSendId: string): string {
    // Wrap all links with click tracking
    const baseUrl = this.getBaseUrl();
    return content.replace(
      /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
      (match, before, url, after) => {
        const trackingUrl = `${baseUrl}/api/tracking/click/${emailSendId}?url=${encodeURIComponent(url)}`;
        return `<a ${before}href="${trackingUrl}"${after}>`;
      }
    );
  }

  async sendSingleEmail(userId: string, request: SendSingleEmailRequest): Promise<string> {
    await awsService.initialize(userId);

    // Pre-generate IDs for tracking
    const emailSendId = randomUUID();
    const trackingPixelId = randomUUID();
    const baseUrl = this.getBaseUrl();
    
    // Add click tracking to links using the pre-generated ID
    let contentWithClickTracking = this.addClickTracking(request.content, emailSendId);
    
    // Add tracking pixel
    const trackingPixel = `<img src="${baseUrl}/api/tracking/pixel/${trackingPixelId}" width="1" height="1" style="display:none;" alt="" />`;
    const contentWithTracking = contentWithClickTracking + trackingPixel;

    try {
      const messageId = await awsService.sendEmail({
        to: [request.to],
        subject: request.subject,
        htmlBody: contentWithTracking,
        from: request.from,
      });

      // Record the email send with the pre-generated ID
      const emailSend: InsertEmailSend = {
        id: emailSendId,
        campaignId: request.campaignId,
        recipientEmail: request.to,
        subject: request.subject,
        content: request.content,
        status: 'sent',
        messageId,
        trackingPixelId,
        sentAt: new Date(),
      };

      await storage.createEmailSend(emailSend, userId);

      return messageId;
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Record the failed send with the same ID
      const emailSend: InsertEmailSend = {
        id: emailSendId,
        campaignId: request.campaignId,
        recipientEmail: request.to,
        subject: request.subject,
        content: request.content,
        status: 'failed',
        trackingPixelId,
      };

      await storage.createEmailSend(emailSend, userId);
      
      // Preserve the original error message for better user guidance
      if (error instanceof Error) {
        throw error;
      }
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

      // Pre-generate IDs for tracking
      const emailSendId = randomUUID();
      const trackingPixelId = randomUUID();
      const baseUrl = this.getBaseUrl();
      
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

      // Add click tracking to links
      let contentWithClickTracking = this.addClickTracking(personalizedContent, emailSendId);
      
      // Add tracking pixel
      const trackingPixel = `<img src="${baseUrl}/api/tracking/pixel/${trackingPixelId}" width="1" height="1" style="display:none;" alt="" />`;
      const contentWithTracking = contentWithClickTracking + trackingPixel;

      try {
        const messageId = await awsService.sendEmail({
          to: [recipient.email],
          subject: personalizedSubject,
          htmlBody: contentWithTracking,
          from: request.from,
        });

        emailSends.push({
          id: emailSendId,
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
          id: emailSendId,
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
