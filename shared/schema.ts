import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: text("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AWS credentials storage
export const awsCredentials = pgTable("aws_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  region: varchar("region").notNull(),
  encryptedAccessKey: text("encrypted_access_key").notNull(),
  encryptedSecretKey: text("encrypted_secret_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  variables: text("variables").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipient lists
export const recipientLists = pgTable("recipient_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipients
export const recipients = pgTable("recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").references(() => recipientLists.id, { onDelete: 'cascade' }).notNull(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email campaigns
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  templateId: varchar("template_id").references(() => emailTemplates.id),
  recipientListId: varchar("recipient_list_id").references(() => recipientLists.id),
  status: varchar("status").notNull().default('draft'), // draft, sending, sent, failed
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual email sends
export const emailSends = pgTable("email_sends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  recipientEmail: varchar("recipient_email").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  status: varchar("status").notNull().default('pending'), // pending, sent, delivered, bounced, complained
  messageId: varchar("message_id"), // AWS SES message ID
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  complainedAt: timestamp("complained_at"),
  bounceReason: text("bounce_reason"),
  complaintReason: text("complaint_reason"),
  trackingPixelId: varchar("tracking_pixel_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email tracking events
export const emailTrackingEvents = pgTable("email_tracking_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailSendId: varchar("email_send_id").references(() => emailSends.id, { onDelete: 'cascade' }).notNull(),
  eventType: varchar("event_type").notNull(), // open, click, bounce, complaint, delivery
  eventData: jsonb("event_data"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Domains - store verified domains
export const domains = pgTable("domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  domain: varchar("domain").notNull().unique(),
  status: varchar("status").notNull().default('pending'), // pending, verified, failed
  verificationToken: text("verification_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// DNS Records - store DKIM and DMARC records for domains
export const dnsRecords = pgTable("dns_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domainId: varchar("domain_id").references(() => domains.id, { onDelete: 'cascade' }).notNull(),
  recordType: varchar("record_type").notNull(), // CNAME, TXT
  recordName: text("record_name").notNull(), // e.g., token._domainkey.example.com
  recordValue: text("record_value").notNull(), // e.g., token.dkim.amazonses.com
  purpose: varchar("purpose").notNull(), // dkim, dmarc, verification
  createdAt: timestamp("created_at").defaultNow(),
});

// Bounce and Complaint Events - track deliverability issues
export const bounceComplaintEvents = pgTable("bounce_complaint_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailSendId: varchar("email_send_id").references(() => emailSends.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type").notNull(), // bounce, complaint
  bounceType: varchar("bounce_type"), // hard, soft, transient (for bounces)
  recipientEmail: varchar("recipient_email").notNull(),
  domain: varchar("domain"),
  reason: text("reason"),
  diagnosticCode: text("diagnostic_code"),
  timestamp: timestamp("timestamp").defaultNow(),
  rawData: jsonb("raw_data"), // store full SNS notification
});

// Tracking Configuration - store SNS topics and tracking status
export const trackingConfig = pgTable("tracking_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  bounceTopicArn: text("bounce_topic_arn"),
  complaintTopicArn: text("complaint_topic_arn"),
  deliveryTopicArn: text("delivery_topic_arn"),
  bounceSubscriptionArn: text("bounce_subscription_arn"),
  complaintSubscriptionArn: text("complaint_subscription_arn"),
  deliverySubscriptionArn: text("delivery_subscription_arn"),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  awsCredentials: many(awsCredentials),
  emailTemplates: many(emailTemplates),
  recipientLists: many(recipientLists),
  emailCampaigns: many(emailCampaigns),
  domains: many(domains),
  trackingConfig: one(trackingConfig),
}));

export const awsCredentialsRelations = relations(awsCredentials, ({ one }) => ({
  user: one(users, {
    fields: [awsCredentials.userId],
    references: [users.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one, many }) => ({
  user: one(users, {
    fields: [emailTemplates.userId],
    references: [users.id],
  }),
  campaigns: many(emailCampaigns),
}));

export const recipientListsRelations = relations(recipientLists, ({ one, many }) => ({
  user: one(users, {
    fields: [recipientLists.userId],
    references: [users.id],
  }),
  recipients: many(recipients),
  campaigns: many(emailCampaigns),
}));

export const recipientsRelations = relations(recipients, ({ one }) => ({
  list: one(recipientLists, {
    fields: [recipients.listId],
    references: [recipientLists.id],
  }),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [emailCampaigns.userId],
    references: [users.id],
  }),
  template: one(emailTemplates, {
    fields: [emailCampaigns.templateId],
    references: [emailTemplates.id],
  }),
  recipientList: one(recipientLists, {
    fields: [emailCampaigns.recipientListId],
    references: [recipientLists.id],
  }),
  emailSends: many(emailSends),
}));

export const emailSendsRelations = relations(emailSends, ({ one, many }) => ({
  campaign: one(emailCampaigns, {
    fields: [emailSends.campaignId],
    references: [emailCampaigns.id],
  }),
  trackingEvents: many(emailTrackingEvents),
}));

export const emailTrackingEventsRelations = relations(emailTrackingEvents, ({ one }) => ({
  emailSend: one(emailSends, {
    fields: [emailTrackingEvents.emailSendId],
    references: [emailSends.id],
  }),
}));

export const domainsRelations = relations(domains, ({ one, many }) => ({
  user: one(users, {
    fields: [domains.userId],
    references: [users.id],
  }),
  dnsRecords: many(dnsRecords),
}));

export const dnsRecordsRelations = relations(dnsRecords, ({ one }) => ({
  domain: one(domains, {
    fields: [dnsRecords.domainId],
    references: [domains.id],
  }),
}));

export const bounceComplaintEventsRelations = relations(bounceComplaintEvents, ({ one }) => ({
  emailSend: one(emailSends, {
    fields: [bounceComplaintEvents.emailSendId],
    references: [emailSends.id],
  }),
}));

export const trackingConfigRelations = relations(trackingConfig, ({ one }) => ({
  user: one(users, {
    fields: [trackingConfig.userId],
    references: [users.id],
  }),
}));

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertAwsCredentials = typeof awsCredentials.$inferInsert;
export type AwsCredentials = typeof awsCredentials.$inferSelect;

export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export type InsertRecipientList = typeof recipientLists.$inferInsert;
export type RecipientList = typeof recipientLists.$inferSelect;

export type InsertRecipient = typeof recipients.$inferInsert;
export type Recipient = typeof recipients.$inferSelect;

export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;

export type InsertEmailSend = typeof emailSends.$inferInsert;
export type EmailSend = typeof emailSends.$inferSelect;

export type InsertEmailTrackingEvent = typeof emailTrackingEvents.$inferInsert;
export type EmailTrackingEvent = typeof emailTrackingEvents.$inferSelect;

export type InsertDomain = typeof domains.$inferInsert;
export type Domain = typeof domains.$inferSelect;

export type InsertDnsRecord = typeof dnsRecords.$inferInsert;
export type DnsRecord = typeof dnsRecords.$inferSelect;

export type InsertBounceComplaintEvent = typeof bounceComplaintEvents.$inferInsert;
export type BounceComplaintEvent = typeof bounceComplaintEvents.$inferSelect;

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAwsCredentialsSchema = createInsertSchema(awsCredentials).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipientListSchema = createInsertSchema(recipientLists).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipientSchema = createInsertSchema(recipients).omit({
  id: true,
  createdAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSendSchema = createInsertSchema(emailSends).omit({
  id: true,
  createdAt: true,
});

export const insertDomainSchema = createInsertSchema(domains).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDnsRecordSchema = createInsertSchema(dnsRecords).omit({
  id: true,
  createdAt: true,
});

export const insertBounceComplaintEventSchema = createInsertSchema(bounceComplaintEvents).omit({
  id: true,
  timestamp: true,
});

export type InsertTrackingConfig = typeof trackingConfig.$inferInsert;
export type TrackingConfig = typeof trackingConfig.$inferSelect;
