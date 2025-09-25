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
import { db, pool } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
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
    // Based on blueprint:javascript_auth_all_persistance - Initialize session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: false,
      tableName: "sessions",
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // AWS credentials operations
  async getAwsCredentials(userId: string): Promise<AwsCredentials | undefined> {
    const [credentials] = await db
      .select()
      .from(awsCredentials)
      .where(eq(awsCredentials.userId, userId));
    return credentials;
  }

  async upsertAwsCredentials(credentials: InsertAwsCredentials & { userId: string }): Promise<AwsCredentials> {
    const [result] = await db
      .insert(awsCredentials)
      .values(credentials)
      .onConflictDoUpdate({
        target: awsCredentials.userId,
        set: {
          ...credentials,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async deleteAwsCredentials(userId: string): Promise<void> {
    await db.delete(awsCredentials).where(eq(awsCredentials.userId, userId));
  }

  // Email template operations
  async getEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string, userId: string): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate & { userId: string }): Promise<EmailTemplate> {
    const [result] = await db.insert(emailTemplates).values(template).returning();
    return result;
  }

  async updateEmailTemplate(id: string, userId: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate> {
    const [result] = await db
      .update(emailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
      .returning();
    return result;
  }

  async deleteEmailTemplate(id: string, userId: string): Promise<void> {
    await db
      .delete(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
  }

  // Recipient list operations
  async getRecipientLists(userId: string): Promise<RecipientList[]> {
    return await db
      .select()
      .from(recipientLists)
      .where(eq(recipientLists.userId, userId))
      .orderBy(desc(recipientLists.createdAt));
  }

  async getRecipientList(id: string, userId: string): Promise<RecipientList | undefined> {
    const [list] = await db
      .select()
      .from(recipientLists)
      .where(and(eq(recipientLists.id, id), eq(recipientLists.userId, userId)));
    return list;
  }

  async createRecipientList(list: InsertRecipientList & { userId: string }): Promise<RecipientList> {
    const [result] = await db.insert(recipientLists).values(list).returning();
    return result;
  }

  async updateRecipientList(id: string, userId: string, list: Partial<InsertRecipientList>): Promise<RecipientList> {
    const [result] = await db
      .update(recipientLists)
      .set({ ...list, updatedAt: new Date() })
      .where(and(eq(recipientLists.id, id), eq(recipientLists.userId, userId)))
      .returning();
    return result;
  }

  async deleteRecipientList(id: string, userId: string): Promise<void> {
    await db
      .delete(recipientLists)
      .where(and(eq(recipientLists.id, id), eq(recipientLists.userId, userId)));
  }

  // Recipient operations
  async getRecipients(listId: string, userId: string): Promise<Recipient[]> {
    // Verify the list belongs to the user
    const list = await this.getRecipientList(listId, userId);
    if (!list) {
      throw new Error('Recipient list not found');
    }

    return await db
      .select()
      .from(recipients)
      .where(eq(recipients.listId, listId))
      .orderBy(desc(recipients.createdAt));
  }

  async createRecipients(recipientData: InsertRecipient[]): Promise<Recipient[]> {
    return await db.insert(recipients).values(recipientData).returning();
  }

  async deleteRecipients(listId: string): Promise<void> {
    await db.delete(recipients).where(eq(recipients.listId, listId));
  }

  // Email campaign operations
  async getEmailCampaigns(userId: string): Promise<EmailCampaign[]> {
    return await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.userId, userId))
      .orderBy(desc(emailCampaigns.createdAt));
  }

  async getEmailCampaign(id: string, userId: string): Promise<EmailCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.userId, userId)));
    return campaign;
  }

  async createEmailCampaign(campaign: InsertEmailCampaign & { userId: string }): Promise<EmailCampaign> {
    const [result] = await db.insert(emailCampaigns).values(campaign).returning();
    return result;
  }

  async updateEmailCampaign(id: string, userId: string, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign> {
    const [result] = await db
      .update(emailCampaigns)
      .set({ ...campaign, updatedAt: new Date() })
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.userId, userId)))
      .returning();
    return result;
  }

  async deleteEmailCampaign(id: string, userId: string): Promise<void> {
    await db
      .delete(emailCampaigns)
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.userId, userId)));
  }

  // Email send operations
  async createEmailSend(emailSend: InsertEmailSend): Promise<EmailSend> {
    const [result] = await db.insert(emailSends).values(emailSend).returning();
    return result;
  }

  async updateEmailSend(id: string, updates: Partial<InsertEmailSend>): Promise<EmailSend> {
    const [result] = await db
      .update(emailSends)
      .set(updates)
      .where(eq(emailSends.id, id))
      .returning();
    return result;
  }

  async getEmailSends(userId: string, limit = 50): Promise<EmailSend[]> {
    return await db
      .select({
        id: emailSends.id,
        campaignId: emailSends.campaignId,
        recipientEmail: emailSends.recipientEmail,
        subject: emailSends.subject,
        content: emailSends.content,
        status: emailSends.status,
        messageId: emailSends.messageId,
        sentAt: emailSends.sentAt,
        deliveredAt: emailSends.deliveredAt,
        openedAt: emailSends.openedAt,
        clickedAt: emailSends.clickedAt,
        bouncedAt: emailSends.bouncedAt,
        complainedAt: emailSends.complainedAt,
        bounceReason: emailSends.bounceReason,
        complaintReason: emailSends.complaintReason,
        trackingPixelId: emailSends.trackingPixelId,
        createdAt: emailSends.createdAt,
      })
      .from(emailSends)
      .leftJoin(emailCampaigns, eq(emailSends.campaignId, emailCampaigns.id))
      .where(eq(emailCampaigns.userId, userId))
      .orderBy(desc(emailSends.createdAt))
      .limit(limit);
  }

  async getEmailSendsByCampaign(campaignId: string): Promise<EmailSend[]> {
    return await db
      .select()
      .from(emailSends)
      .where(eq(emailSends.campaignId, campaignId))
      .orderBy(desc(emailSends.createdAt));
  }

  // Email tracking operations
  async createTrackingEvent(event: InsertEmailTrackingEvent): Promise<EmailTrackingEvent> {
    const [result] = await db.insert(emailTrackingEvents).values(event).returning();
    return result;
  }

  async getEmailSendByTrackingPixel(trackingPixelId: string): Promise<EmailSend | undefined> {
    const [emailSend] = await db
      .select()
      .from(emailSends)
      .where(eq(emailSends.trackingPixelId, trackingPixelId));
    return emailSend;
  }

  async getEmailSendByMessageId(messageId: string): Promise<EmailSend | undefined> {
    const [emailSend] = await db
      .select()
      .from(emailSends)
      .where(eq(emailSends.messageId, messageId));
    return emailSend;
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
    const [stats] = await db
      .select({
        totalSent: count(),
        totalDelivered: sql<number>`count(case when ${emailSends.status} = 'delivered' then 1 end)`,
        totalOpened: sql<number>`count(case when ${emailSends.openedAt} is not null then 1 end)`,
        totalClicked: sql<number>`count(case when ${emailSends.clickedAt} is not null then 1 end)`,
        totalBounced: sql<number>`count(case when ${emailSends.status} = 'bounced' then 1 end)`,
        totalComplained: sql<number>`count(case when ${emailSends.status} = 'complained' then 1 end)`,
      })
      .from(emailSends)
      .leftJoin(emailCampaigns, eq(emailSends.campaignId, emailCampaigns.id))
      .where(eq(emailCampaigns.userId, userId));

    return {
      totalSent: stats.totalSent,
      totalDelivered: stats.totalDelivered,
      totalOpened: stats.totalOpened,
      totalClicked: stats.totalClicked,
      totalBounced: stats.totalBounced,
      totalComplained: stats.totalComplained,
    };
  }
}

export const storage = new DatabaseStorage();
