export interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
}

export interface EmailSendRecord {
  id: string;
  campaignId?: string;
  recipientEmail: string;
  subject: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  complainedAt?: string;
  bounceReason?: string;
  complaintReason?: string;
  createdAt: string;
}

export interface QuickSendForm {
  to: string;
  subject: string;
  content: string;
}

export interface BulkSendForm {
  subject: string;
  content: string;
  recipientListId: string;
}

export interface AwsCredentialsForm {
  region: string;
  encryptedAccessKey: string;
  encryptedSecretKey: string;
}

export interface TemplateForm {
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export interface RecipientListForm {
  name: string;
  description: string;
}
