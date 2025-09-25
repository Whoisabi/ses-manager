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
  email: varchar("email").unique(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  awsCredentials: many(awsCredentials),
  emailTemplates: many(emailTemplates),
  recipientLists: many(recipientLists),
  emailCampaigns: many(emailCampaigns),
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

// Zod schemas
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
