import {
  users,
  awsCredentials,
  emailTemplates,
  recipientLists,
  recipients,
  emailCampaigns,
  emailSends,
  emailTrackingEvents,
  type User,
  type UpsertUser,
  type AwsCredentials,
  type InsertAwsCredentials,
  type EmailTemplate,
  type InsertEmailTemplate,
  type RecipientList,
  type InsertRecipientList,
  type Recipient,
  type InsertRecipient,
  type EmailCampaign,
  type InsertEmailCampaign,
  type EmailSend,
  type InsertEmailSend,
  type EmailTrackingEvent,
  type InsertEmailTrackingEvent,
  insertUserSchema,
} from "@shared/schema";
import { prisma } from "./db";
import session from "express-session";
import { z } from "zod";

type InsertUser = z.infer<typeof insertUserSchema>;

export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // AWS credentials operations
  getAwsCredentials(userId: string): Promise<AwsCredentials | undefined>;
  upsertAwsCredentials(credentials: InsertAwsCredentials & { userId: string }): Promise<AwsCredentials>;
  deleteAwsCredentials(userId: string): Promise<void>;

  // Email template operations
  getEmailTemplates(userId: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string, userId: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate & { userId: string }): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, userId: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: string, userId: string): Promise<void>;

  // Recipient list operations
  getRecipientLists(userId: string): Promise<RecipientList[]>;
  getRecipientList(id: string, userId: string): Promise<RecipientList | undefined>;
  createRecipientList(list: InsertRecipientList & { userId: string }): Promise<RecipientList>;
  updateRecipientList(id: string, userId: string, list: Partial<InsertRecipientList>): Promise<RecipientList>;
  deleteRecipientList(id: string, userId: string): Promise<void>;

  // Recipient operations
  getRecipients(listId: string, userId: string): Promise<Recipient[]>;
  createRecipients(recipients: InsertRecipient[]): Promise<Recipient[]>;
  deleteRecipients(listId: string): Promise<void>;

  // Email campaign operations
  getEmailCampaigns(userId: string): Promise<EmailCampaign[]>;
  getEmailCampaign(id: string, userId: string): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign & { userId: string }): Promise<EmailCampaign>;
  updateEmailCampaign(id: string, userId: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign>;
  deleteEmailCampaign(id: string, userId: string): Promise<void>;

  // Email send operations
  createEmailSend(emailSend: InsertEmailSend): Promise<EmailSend>;
  updateEmailSend(id: string, updates: Partial<InsertEmailSend>): Promise<EmailSend>;
  getEmailSends(userId: string, limit?: number): Promise<EmailSend[]>;
  getEmailSendsByCampaign(campaignId: string): Promise<EmailSend[]>;

  // Email tracking operations
  createTrackingEvent(event: InsertEmailTrackingEvent): Promise<EmailTrackingEvent>;
  getEmailSendByTrackingPixel(trackingPixelId: string): Promise<EmailSend | undefined>;
  getEmailSendByMessageId(messageId: string): Promise<EmailSend | undefined>;

  // Analytics operations
  getEmailStats(userId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalComplained: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Use default memory store for development
    this.sessionStore = new session.MemoryStore();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return undefined;
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.profile_image_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return undefined;
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.profile_image_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async createUser(userData: InsertUser): Promise<User> {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        profile_image_url: userData.profileImageUrl,
        // created_at and updated_at are set by default in schema
      },
    });
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.profile_image_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user = await prisma.user.upsert({
      where: { id: userData.id },
      update: {
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        profile_image_url: userData.profileImageUrl,
        updated_at: new Date(),
      },
      create: {
        id: userData.id,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        profile_image_url: userData.profileImageUrl,
        created_at: userData.createdAt ?? new Date(),
        updated_at: userData.updatedAt ?? new Date(),
      },
    });
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.profile_image_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  // AWS credentials operations

  async getAwsCredentials(userId: string): Promise<AwsCredentials | undefined> {
  const creds = await prisma.awsCredential.findFirst({ where: { user_id: userId } });
    if (!creds) return undefined;
    return {
      id: creds.id,
      userId: creds.user_id,
      region: creds.region,
      encryptedAccessKey: creds.encrypted_access_key,
      encryptedSecretKey: creds.encrypted_secret_key,
      createdAt: creds.created_at,
      updatedAt: creds.updated_at,
    };
  }

  async upsertAwsCredentials(credentials: InsertAwsCredentials & { userId: string }): Promise<AwsCredentials> {
    // Upsert by user_id is not supported by Prisma, so find first then update or create
    const existing = await prisma.awsCredential.findFirst({ where: { user_id: credentials.userId } });
    let creds;
    if (existing) {
      creds = await prisma.awsCredential.update({
        where: { id: existing.id },
        data: {
          region: credentials.region,
          encrypted_access_key: credentials.encryptedAccessKey,
          encrypted_secret_key: credentials.encryptedSecretKey,
          updated_at: new Date(),
        },
      });
    } else {
      creds = await prisma.awsCredential.create({
        data: {
          user_id: credentials.userId,
          region: credentials.region,
          encrypted_access_key: credentials.encryptedAccessKey,
          encrypted_secret_key: credentials.encryptedSecretKey,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    return {
      id: creds.id,
      userId: creds.user_id,
      region: creds.region,
      encryptedAccessKey: creds.encrypted_access_key,
      encryptedSecretKey: creds.encrypted_secret_key,
      createdAt: creds.created_at,
      updatedAt: creds.updated_at,
    };
  }

  async deleteAwsCredentials(userId: string): Promise<void> {
    const existing = await prisma.awsCredential.findFirst({ where: { user_id: userId } });
    if (existing) {
      await prisma.awsCredential.delete({ where: { id: existing.id } });
    }
  }

  // Email template operations

  async getEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return templates.map(t => ({
      id: t.id,
      userId: t.user_id,
      name: t.name,
      subject: t.subject,
      content: t.content,
      variables: t.variables,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  }

  async getEmailTemplate(id: string, userId: string): Promise<EmailTemplate | undefined> {
    const t = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!t || t.user_id !== userId) return undefined;
    return {
      id: t.id,
      userId: t.user_id,
      name: t.name,
      subject: t.subject,
      content: t.content,
      variables: t.variables,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }

  async createEmailTemplate(template: InsertEmailTemplate & { userId: string }): Promise<EmailTemplate> {
    const t = await prisma.emailTemplate.create({
      data: {
        user_id: template.userId,
        name: template.name,
        subject: template.subject,
        content: template.content,
        variables: template.variables ?? [],
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return {
      id: t.id,
      userId: t.user_id,
      name: t.name,
      subject: t.subject,
      content: t.content,
      variables: t.variables,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }

  async updateEmailTemplate(id: string, userId: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate> {
    // Ensure variables is never null
    const updateData = {
      ...template,
      variables: template.variables ?? undefined,
      updated_at: new Date(),
    };
    const t = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });
    return {
      id: t.id,
      userId: t.user_id,
      name: t.name,
      subject: t.subject,
      content: t.content,
      variables: t.variables,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }

  async deleteEmailTemplate(id: string, userId: string): Promise<void> {
    await prisma.emailTemplate.delete({ where: { id } });
  }

  // Recipient list operations

  async getRecipientLists(userId: string): Promise<RecipientList[]> {
    const lists = await prisma.recipientList.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return lists.map(l => ({
      id: l.id,
      userId: l.user_id,
      name: l.name,
      description: l.description,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    }));
  }

  async getRecipientList(id: string, userId: string): Promise<RecipientList | undefined> {
    const l = await prisma.recipientList.findUnique({ where: { id } });
    if (!l || l.user_id !== userId) return undefined;
    return {
      id: l.id,
      userId: l.user_id,
      name: l.name,
      description: l.description,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    };
  }

  async createRecipientList(list: InsertRecipientList & { userId: string }): Promise<RecipientList> {
    const l = await prisma.recipientList.create({
      data: {
        user_id: list.userId,
        name: list.name,
        description: list.description,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return {
      id: l.id,
      userId: l.user_id,
      name: l.name,
      description: l.description,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    };
  }

  async updateRecipientList(id: string, userId: string, list: Partial<InsertRecipientList>): Promise<RecipientList> {
    const l = await prisma.recipientList.update({
      where: { id },
      data: {
        ...list,
        updated_at: new Date(),
      },
    });
    return {
      id: l.id,
      userId: l.user_id,
      name: l.name,
      description: l.description,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    };
  }

  async deleteRecipientList(id: string, userId: string): Promise<void> {
    await prisma.recipientList.delete({ where: { id } });
  }

  // Recipient operations

  async getRecipients(listId: string, userId: string): Promise<Recipient[]> {
    // Verify the list belongs to the user
    const list = await this.getRecipientList(listId, userId);
    if (!list) {
      throw new Error('Recipient list not found');
    }
    const recs = await prisma.recipient.findMany({
      where: { list_id: listId },
      orderBy: { created_at: 'desc' },
    });
    return recs.map(r => ({
      id: r.id,
      listId: r.list_id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      metadata: r.metadata,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
  }

  async createRecipients(recipientData: InsertRecipient[]): Promise<Recipient[]> {
    // Map listId to list_id for Prisma
    const mappedData = recipientData.map(r => ({
      email: r.email,
      list_id: r.listId,
      first_name: r.firstName,
      last_name: r.lastName,
      metadata: r.metadata ?? null,
      is_active: r.isActive,
      created_at: r.createdAt ?? new Date(),
    }));
    await prisma.recipient.createMany({ data: mappedData as any });
    // Return all recipients for the list (since createMany doesn't return inserted rows)
    if (recipientData.length > 0) {
      // Find the userId from the first recipient's listId
      const listId = recipientData[0].listId;
      const list = await prisma.recipientList.findUnique({ where: { id: listId } });
      if (!list) {
        console.error(`[createRecipients] Recipient list not found for listId: ${listId}`);
      } else {
        console.log(`[createRecipients] Found recipient list: ${listId}, userId: ${list.user_id}`);
      }
      const userId = list ? list.user_id : "";
      return this.getRecipients(listId, userId);
    }
    return [];
  }

  async deleteRecipients(listId: string): Promise<void> {
    await prisma.recipient.deleteMany({ where: { list_id: listId } });
  }

  // Email campaign operations

  async getEmailCampaigns(userId: string): Promise<EmailCampaign[]> {
    const campaigns = await prisma.emailCampaign.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return campaigns.map(c => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      subject: c.subject,
      content: c.content,
      templateId: c.template_id,
      recipientListId: c.recipient_list_id,
      status: c.status,
      scheduledAt: c.scheduled_at,
      sentAt: c.sent_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  async getEmailCampaign(id: string, userId: string): Promise<EmailCampaign | undefined> {
    const c = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!c || c.user_id !== userId) return undefined;
    return {
      id: c.id,
      userId: c.user_id,
      name: c.name,
      subject: c.subject,
      content: c.content,
      templateId: c.template_id,
      recipientListId: c.recipient_list_id,
      status: c.status,
      scheduledAt: c.scheduled_at,
      sentAt: c.sent_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }

  async createEmailCampaign(campaign: InsertEmailCampaign & { userId: string }): Promise<EmailCampaign> {
    const c = await prisma.emailCampaign.create({
      data: {
        user_id: campaign.userId,
        name: campaign.name,
        subject: campaign.subject,
        content: campaign.content,
        template_id: campaign.templateId,
        recipient_list_id: campaign.recipientListId,
        status: campaign.status ?? 'draft',
        scheduled_at: campaign.scheduledAt,
        sent_at: campaign.sentAt,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return {
      id: c.id,
      userId: c.user_id,
      name: c.name,
      subject: c.subject,
      content: c.content,
      templateId: c.template_id,
      recipientListId: c.recipient_list_id,
      status: c.status,
      scheduledAt: c.scheduled_at,
      sentAt: c.sent_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }

  async updateEmailCampaign(id: string, userId: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign> {
    const c = await prisma.emailCampaign.update({
      where: { id },
      data: {
        ...campaign,
        updated_at: new Date(),
      },
    });
    return {
      id: c.id,
      userId: c.user_id,
      name: c.name,
      subject: c.subject,
      content: c.content,
      templateId: c.template_id,
      recipientListId: c.recipient_list_id,
      status: c.status,
      scheduledAt: c.scheduled_at,
      sentAt: c.sent_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  }

  async deleteEmailCampaign(id: string, userId: string): Promise<void> {
    await prisma.emailCampaign.delete({ where: { id } });
  }

  // Email send operations

  async createEmailSend(emailSend: InsertEmailSend): Promise<EmailSend> {
    const sendData: any = {
      recipient_email: emailSend.recipientEmail,
      subject: emailSend.subject,
      content: emailSend.content,
      status: emailSend.status ?? 'pending',
      message_id: emailSend.messageId,
      sent_at: emailSend.sentAt,
      delivered_at: emailSend.deliveredAt,
      opened_at: emailSend.openedAt,
      clicked_at: emailSend.clickedAt,
      bounced_at: emailSend.bouncedAt,
      complained_at: emailSend.complainedAt,
      bounce_reason: emailSend.bounceReason,
      complaint_reason: emailSend.complaintReason,
      tracking_pixel_id: emailSend.trackingPixelId,
      created_at: new Date(),
    };
    if (emailSend.campaignId) sendData.campaign_id = emailSend.campaignId;
    const e = await prisma.emailSend.create({ data: sendData });
    return {
      id: e.id,
      campaignId: e.campaign_id,
      recipientEmail: e.recipient_email,
      subject: e.subject,
      content: e.content,
      status: e.status,
      messageId: e.message_id,
      sentAt: e.sent_at,
      deliveredAt: e.delivered_at,
      openedAt: e.opened_at,
      clickedAt: e.clicked_at,
      bouncedAt: e.bounced_at,
      complainedAt: e.complained_at,
      bounceReason: e.bounce_reason,
      complaintReason: e.complaint_reason,
      trackingPixelId: e.tracking_pixel_id,
      createdAt: e.created_at,
    };
  }

  async updateEmailSend(id: string, updates: Partial<InsertEmailSend>): Promise<EmailSend> {
    const e = await prisma.emailSend.update({
      where: { id },
      data: updates,
    });
    return {
      id: e.id,
      campaignId: e.campaign_id,
      recipientEmail: e.recipient_email,
      subject: e.subject,
      content: e.content,
      status: e.status,
      messageId: e.message_id,
      sentAt: e.sent_at,
      deliveredAt: e.delivered_at,
      openedAt: e.opened_at,
      clickedAt: e.clicked_at,
      bouncedAt: e.bounced_at,
      complainedAt: e.complained_at,
      bounceReason: e.bounce_reason,
      complaintReason: e.complaint_reason,
      trackingPixelId: e.tracking_pixel_id,
      createdAt: e.created_at,
    };
  }

  async getEmailSends(userId: string, limit = 50): Promise<EmailSend[]> {
    const sends = await prisma.emailSend.findMany({
      where: {
        campaign: { user_id: userId },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return sends.map(e => ({
      id: e.id,
      campaignId: e.campaign_id,
      recipientEmail: e.recipient_email,
      subject: e.subject,
      content: e.content,
      status: e.status,
      messageId: e.message_id,
      sentAt: e.sent_at,
      deliveredAt: e.delivered_at,
      openedAt: e.opened_at,
      clickedAt: e.clicked_at,
      bouncedAt: e.bounced_at,
      complainedAt: e.complained_at,
      bounceReason: e.bounce_reason,
      complaintReason: e.complaint_reason,
      trackingPixelId: e.tracking_pixel_id,
      createdAt: e.created_at,
    }));
  }

  async getEmailSendsByCampaign(campaignId: string): Promise<EmailSend[]> {
    const sends = await prisma.emailSend.findMany({
      where: { campaign_id: campaignId },
      orderBy: { created_at: 'desc' },
    });
    return sends.map(e => ({
      id: e.id,
      campaignId: e.campaign_id,
      recipientEmail: e.recipient_email,
      subject: e.subject,
      content: e.content,
      status: e.status,
      messageId: e.message_id,
      sentAt: e.sent_at,
      deliveredAt: e.delivered_at,
      openedAt: e.opened_at,
      clickedAt: e.clicked_at,
      bouncedAt: e.bounced_at,
      complainedAt: e.complained_at,
      bounceReason: e.bounce_reason,
      complaintReason: e.complaint_reason,
      trackingPixelId: e.tracking_pixel_id,
      createdAt: e.created_at,
    }));
  }

  // Email tracking operations

  async createTrackingEvent(event: InsertEmailTrackingEvent): Promise<EmailTrackingEvent> {
    const t = await prisma.emailTrackingEvent.create({
      data: {
        email_send_id: event.emailSendId,
        event_type: event.eventType,
  event_data: event.eventData as any,
        timestamp: event.timestamp ?? new Date(),
      },
    });
    return {
      id: t.id,
      emailSendId: t.email_send_id,
      eventType: t.event_type,
      eventData: t.event_data,
      timestamp: t.timestamp,
    };
  }

  async getEmailSendByTrackingPixel(trackingPixelId: string): Promise<EmailSend | undefined> {
    const e = await prisma.emailSend.findFirst({ where: { tracking_pixel_id: trackingPixelId } });
    if (!e) return undefined;
    return {
      id: e.id,
      campaignId: e.campaign_id,
      recipientEmail: e.recipient_email,
      subject: e.subject,
      content: e.content,
      status: e.status,
      messageId: e.message_id,
      sentAt: e.sent_at,
      deliveredAt: e.delivered_at,
      openedAt: e.opened_at,
      clickedAt: e.clicked_at,
      bouncedAt: e.bounced_at,
      complainedAt: e.complained_at,
      bounceReason: e.bounce_reason,
      complaintReason: e.complaint_reason,
      trackingPixelId: e.tracking_pixel_id,
      createdAt: e.created_at,
    };
  }

  async getEmailSendByMessageId(messageId: string): Promise<EmailSend | undefined> {
    const e = await prisma.emailSend.findFirst({ where: { message_id: messageId } });
    if (!e) return undefined;
    return {
      id: e.id,
      campaignId: e.campaign_id,
      recipientEmail: e.recipient_email,
      subject: e.subject,
      content: e.content,
      status: e.status,
      messageId: e.message_id,
      sentAt: e.sent_at,
      deliveredAt: e.delivered_at,
      openedAt: e.opened_at,
      clickedAt: e.clicked_at,
      bouncedAt: e.bounced_at,
      complainedAt: e.complained_at,
      bounceReason: e.bounce_reason,
      complaintReason: e.complaint_reason,
      trackingPixelId: e.tracking_pixel_id,
      createdAt: e.created_at,
    };
  }

  // Analytics operations

  async getEmailStats(userId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalComplained: number;
  }> {
    const totalSent = await prisma.emailSend.count({
      where: { campaign: { user_id: userId } },
    });
    const totalDelivered = await prisma.emailSend.count({
      where: { campaign: { user_id: userId }, status: 'delivered' },
    });
    const totalOpened = await prisma.emailSend.count({
      where: { campaign: { user_id: userId }, opened_at: { not: null } },
    });
    const totalClicked = await prisma.emailSend.count({
      where: { campaign: { user_id: userId }, clicked_at: { not: null } },
    });
    const totalBounced = await prisma.emailSend.count({
      where: { campaign: { user_id: userId }, status: 'bounced' },
    });
    const totalComplained = await prisma.emailSend.count({
      where: { campaign: { user_id: userId }, status: 'complained' },
    });
    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      totalComplained,
    };
  }
}

export const storage = new DatabaseStorage();
