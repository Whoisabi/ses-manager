import { storage } from '../storage';
import { awsService } from './awsService';
import { randomUUID } from 'crypto';
import type { InsertSmsSend } from '@shared/schema';

export interface SendSingleSMSRequest {
  to: string;
  content: string;
  campaignId?: string;
  senderID?: string;
}

export interface SendBulkSMSRequest {
  content: string;
  recipientListId: string;
  campaignId?: string;
  senderID?: string;
}

export class SMSService {
  async sendSingleSMS(userId: string, request: SendSingleSMSRequest): Promise<string> {
    await awsService.initialize(userId);

    const smsSendId = randomUUID();

    try {
      const messageId = await awsService.sendSMS({
        phoneNumber: request.to,
        message: request.content,
        senderID: request.senderID,
      });

      const smsSend: InsertSmsSend = {
        id: smsSendId,
        campaignId: request.campaignId,
        userId,
        recipientPhone: request.to,
        content: request.content,
        status: 'sent',
        messageId,
        sentAt: new Date(),
      };

      await storage.createSmsSend(smsSend);

      return messageId;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      
      const smsSend: InsertSmsSend = {
        id: smsSendId,
        campaignId: request.campaignId,
        userId,
        recipientPhone: request.to,
        content: request.content,
        status: 'failed',
        failureReason: error instanceof Error ? error.message : 'Failed to send SMS',
        failedAt: new Date(),
      };

      await storage.createSmsSend(smsSend);
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to send SMS');
    }
  }

  async sendBulkSMS(userId: string, request: SendBulkSMSRequest): Promise<void> {
    await awsService.initialize(userId);

    const recipients = await storage.getRecipients(request.recipientListId, userId);
    
    if (recipients.length === 0) {
      throw new Error('No recipients found in the selected list');
    }

    const smsSends: InsertSmsSend[] = [];

    for (const recipient of recipients) {
      if (!recipient.isActive || !recipient.phoneNumber) continue;

      const smsSendId = randomUUID();
      
      let personalizedContent = request.content;
      
      if (recipient.firstName) {
        personalizedContent = personalizedContent.replace(/{{firstName}}/g, recipient.firstName);
      }
      
      if (recipient.lastName) {
        personalizedContent = personalizedContent.replace(/{{lastName}}/g, recipient.lastName);
      }
      
      if (recipient.phoneNumber) {
        personalizedContent = personalizedContent.replace(/{{phoneNumber}}/g, recipient.phoneNumber);
      }

      if (recipient.metadata && typeof recipient.metadata === 'object') {
        for (const [key, value] of Object.entries(recipient.metadata)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedContent = personalizedContent.replace(regex, String(value));
        }
      }

      try {
        const messageId = await awsService.sendSMS({
          phoneNumber: recipient.phoneNumber,
          message: personalizedContent,
          senderID: request.senderID,
        });

        smsSends.push({
          id: smsSendId,
          campaignId: request.campaignId,
          userId,
          recipientPhone: recipient.phoneNumber,
          content: personalizedContent,
          status: 'sent',
          messageId,
          sentAt: new Date(),
        });
      } catch (error) {
        console.error(`Failed to send SMS to ${recipient.phoneNumber}:`, error);
        smsSends.push({
          id: smsSendId,
          campaignId: request.campaignId,
          userId,
          recipientPhone: recipient.phoneNumber,
          content: personalizedContent,
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Failed to send SMS',
          failedAt: new Date(),
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    for (const smsSend of smsSends) {
      await storage.createSmsSend(smsSend);
    }
  }
}

export const smsService = new SMSService();
