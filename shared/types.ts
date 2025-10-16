import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Export Prisma types directly
export type User = {
  id: string;
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type AwsCredentials = {
  id: string;
  userId: string;
  region: string;
  encryptedAccessKey: string;
  encryptedSecretKey: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type EmailTemplate = {
  id: string;
  userId: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type RecipientList = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Recipient = {
  id: string;
  listId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  metadata: Prisma.JsonValue | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export type EmailCampaign = {
  id: string;
  userId: string;
  name: string;
  subject: string;
  content: string;
  templateId: string | null;
  recipientListId: string | null;
  status: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type EmailSend = {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  content: string;
  status: string;
  messageId: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
  bounceReason: string | null;
  complaintReason: string | null;
  trackingPixelId: string | null;
  createdAt: Date | null;
};

export type EmailTrackingEvent = {
  id: string;
  emailSendId: string;
  eventType: string;
  eventData: Prisma.JsonValue | null;
  timestamp: Date | null;
};

export type Domain = {
  id: string;
  userId: string;
  domain: string;
  status: string;
  verificationToken: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type DnsRecord = {
  id: string;
  domainId: string;
  recordType: string;
  recordName: string;
  recordValue: string;
  purpose: string;
  createdAt: Date | null;
};

export type BounceComplaintEvent = {
  id: string;
  emailSendId: string | null;
  eventType: string;
  bounceType: string | null;
  recipientEmail: string;
  domain: string | null;
  reason: string | null;
  diagnosticCode: string | null;
  timestamp: Date | null;
  rawData: Prisma.JsonValue | null;
};

// Insert types (for creating new records)
export type InsertUser = {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

export type UpsertUser = {
  id: string;
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type InsertAwsCredentials = {
  region: string;
  encryptedAccessKey: string;
  encryptedSecretKey: string;
};

export type InsertEmailTemplate = {
  name: string;
  subject: string;
  content: string;
  variables?: string[];
};

export type InsertRecipientList = {
  name: string;
  description?: string | null;
};

export type InsertRecipient = {
  listId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  metadata?: Prisma.JsonValue | null;
  isActive?: boolean | null;
};

export type InsertEmailCampaign = {
  name: string;
  subject: string;
  content: string;
  templateId?: string | null;
  recipientListId?: string | null;
  status?: string;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
};

export type InsertEmailSend = {
  campaignId?: string;
  recipientEmail: string;
  subject: string;
  content: string;
  status?: string;
  messageId?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  openedAt?: Date | null;
  clickedAt?: Date | null;
  bouncedAt?: Date | null;
  complainedAt?: Date | null;
  bounceReason?: string | null;
  complaintReason?: string | null;
  trackingPixelId?: string | null;
};

export type InsertEmailTrackingEvent = {
  emailSendId: string;
  eventType: string;
  eventData?: Prisma.JsonValue | null;
};

export type InsertDomain = {
  domain: string;
  status?: string;
  verificationToken?: string | null;
};

export type InsertDnsRecord = {
  domainId: string;
  recordType: string;
  recordName: string;
  recordValue: string;
  purpose: string;
};

export type InsertBounceComplaintEvent = {
  emailSendId?: string | null;
  eventType: string;
  bounceType?: string | null;
  recipientEmail: string;
  domain?: string | null;
  reason?: string | null;
  diagnosticCode?: string | null;
  rawData?: Prisma.JsonValue | null;
};

export type TrackingConfig = {
  id: string;
  userId: string;
  isEnabled: boolean;
  bounceTopicArn: string | null;
  complaintTopicArn: string | null;
  deliveryTopicArn: string | null;
  bounceSubscriptionArn: string | null;
  complaintSubscriptionArn: string | null;
  deliverySubscriptionArn: string | null;
  webhookUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type InsertTrackingConfig = {
  userId: string;
  isEnabled?: boolean;
  bounceTopicArn?: string | null;
  complaintTopicArn?: string | null;
  deliveryTopicArn?: string | null;
  bounceSubscriptionArn?: string | null;
  complaintSubscriptionArn?: string | null;
  deliverySubscriptionArn?: string | null;
  webhookUrl?: string | null;
};

export type ConfigurationSet = {
  id: string;
  userId: string;
  name: string;
  snsTopicArn: string | null;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type InsertConfigurationSet = {
  userId: string;
  name: string;
  snsTopicArn?: string | null;
  openTrackingEnabled?: boolean;
  clickTrackingEnabled?: boolean;
};

// Zod validation schemas
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  profileImageUrl: z.string().optional().nullable(),
});

export const insertAwsCredentialsSchema = z.object({
  region: z.string(),
  encryptedAccessKey: z.string(),
  encryptedSecretKey: z.string(),
});

export const insertEmailTemplateSchema = z.object({
  name: z.string(),
  subject: z.string(),
  content: z.string(),
  variables: z.array(z.string()).optional(),
});

export const insertRecipientListSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
});

export const insertRecipientSchema = z.object({
  listId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
});

export const insertEmailCampaignSchema = z.object({
  name: z.string(),
  subject: z.string(),
  content: z.string(),
  templateId: z.string().optional().nullable(),
  recipientListId: z.string().optional().nullable(),
  status: z.string().optional(),
  scheduledAt: z.date().optional().nullable(),
  sentAt: z.date().optional().nullable(),
});

export const insertEmailSendSchema = z.object({
  campaignId: z.string().optional(),
  recipientEmail: z.string().email(),
  subject: z.string(),
  content: z.string(),
  status: z.string().optional(),
  messageId: z.string().optional().nullable(),
  sentAt: z.date().optional().nullable(),
  deliveredAt: z.date().optional().nullable(),
  openedAt: z.date().optional().nullable(),
  clickedAt: z.date().optional().nullable(),
  bouncedAt: z.date().optional().nullable(),
  complainedAt: z.date().optional().nullable(),
  bounceReason: z.string().optional().nullable(),
  complaintReason: z.string().optional().nullable(),
  trackingPixelId: z.string().optional().nullable(),
});

export const insertDomainSchema = z.object({
  domain: z.string(),
  status: z.string().optional(),
  verificationToken: z.string().optional().nullable(),
});

export const insertDnsRecordSchema = z.object({
  domainId: z.string(),
  recordType: z.string(),
  recordName: z.string(),
  recordValue: z.string(),
  purpose: z.string(),
});

export const insertBounceComplaintEventSchema = z.object({
  emailSendId: z.string().optional().nullable(),
  eventType: z.string(),
  bounceType: z.string().optional().nullable(),
  recipientEmail: z.string().email(),
  domain: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  diagnosticCode: z.string().optional().nullable(),
  rawData: z.any().optional().nullable(),
});

export const insertTrackingConfigSchema = z.object({
  userId: z.string(),
  isEnabled: z.boolean().optional(),
  bounceTopicArn: z.string().optional().nullable(),
  complaintTopicArn: z.string().optional().nullable(),
  deliveryTopicArn: z.string().optional().nullable(),
  bounceSubscriptionArn: z.string().optional().nullable(),
  complaintSubscriptionArn: z.string().optional().nullable(),
  deliverySubscriptionArn: z.string().optional().nullable(),
  webhookUrl: z.string().optional().nullable(),
});
