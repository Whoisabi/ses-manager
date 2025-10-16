import { SNSClient, CreateTopicCommand, SubscribeCommand, UnsubscribeCommand, SetTopicAttributesCommand, DeleteTopicCommand } from '@aws-sdk/client-sns';
import { SESClient, SetIdentityNotificationTopicCommand } from '@aws-sdk/client-ses';
import { decrypt } from './encryptionService';
import { storage } from '../storage';

export interface SNSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class SNSService {
  private snsClient: SNSClient | null = null;
  private sesClient: SESClient | null = null;

  async initialize(userId: string): Promise<void> {
    const credentials = await storage.getAwsCredentials(userId);
    if (!credentials) {
      throw new Error('AWS credentials not configured');
    }

    try {
      const accessKeyId = decrypt(credentials.encryptedAccessKey);
      const secretAccessKey = decrypt(credentials.encryptedSecretKey);

      this.snsClient = new SNSClient({
        region: credentials.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.sesClient = new SESClient({
        region: credentials.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } catch (error) {
      throw new Error('Failed to decrypt AWS credentials');
    }
  }

  private ensureInitialized(): { sns: SNSClient; ses: SESClient } {
    if (!this.snsClient || !this.sesClient) {
      throw new Error('SNS service not initialized. Call initialize() first.');
    }
    return { sns: this.snsClient, ses: this.sesClient };
  }

  async createTopic(name: string): Promise<string> {
    const { sns } = this.ensureInitialized();
    
    const command = new CreateTopicCommand({
      Name: name,
    });

    const response = await sns.send(command);
    return response.TopicArn!;
  }

  async subscribeTopic(topicArn: string, endpoint: string): Promise<string> {
    const { sns } = this.ensureInitialized();
    
    const command = new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: 'https',
      Endpoint: endpoint,
    });

    const response = await sns.send(command);
    return response.SubscriptionArn!;
  }

  async unsubscribeTopic(subscriptionArn: string): Promise<void> {
    const { sns } = this.ensureInitialized();
    
    const command = new UnsubscribeCommand({
      SubscriptionArn: subscriptionArn,
    });

    await sns.send(command);
  }

  async deleteTopic(topicArn: string): Promise<void> {
    const { sns } = this.ensureInitialized();
    
    const command = new DeleteTopicCommand({
      TopicArn: topicArn,
    });

    await sns.send(command);
  }

  async configureIdentityNotifications(
    identity: string,
    bounceTopicArn?: string,
    complaintTopicArn?: string,
    deliveryTopicArn?: string
  ): Promise<void> {
    const { ses } = this.ensureInitialized();

    // Configure bounce notifications
    if (bounceTopicArn !== undefined) {
      await ses.send(new SetIdentityNotificationTopicCommand({
        Identity: identity,
        NotificationType: 'Bounce',
        SnsTopic: bounceTopicArn || undefined,
      }));
    }

    // Configure complaint notifications
    if (complaintTopicArn !== undefined) {
      await ses.send(new SetIdentityNotificationTopicCommand({
        Identity: identity,
        NotificationType: 'Complaint',
        SnsTopic: complaintTopicArn || undefined,
      }));
    }

    // Configure delivery notifications
    if (deliveryTopicArn !== undefined) {
      await ses.send(new SetIdentityNotificationTopicCommand({
        Identity: identity,
        NotificationType: 'Delivery',
        SnsTopic: deliveryTopicArn || undefined,
      }));
    }
  }

  async setupTracking(userId: string, webhookUrl: string, identities: string[]): Promise<{
    bounceTopicArn: string;
    complaintTopicArn: string;
    deliveryTopicArn: string;
    bounceSubscriptionArn: string;
    complaintSubscriptionArn: string;
    deliverySubscriptionArn: string;
  }> {
    await this.initialize(userId);

    // Create topics with user-specific names
    const userPrefix = userId.substring(0, 8);
    const bounceTopicArn = await this.createTopic(`ses-bounces-${userPrefix}`);
    const complaintTopicArn = await this.createTopic(`ses-complaints-${userPrefix}`);
    const deliveryTopicArn = await this.createTopic(`ses-deliveries-${userPrefix}`);

    // Subscribe webhook to topics
    const bounceSubscriptionArn = await this.subscribeTopic(bounceTopicArn, webhookUrl);
    const complaintSubscriptionArn = await this.subscribeTopic(complaintTopicArn, webhookUrl);
    const deliverySubscriptionArn = await this.subscribeTopic(deliveryTopicArn, webhookUrl);

    // Configure all verified identities
    for (const identity of identities) {
      await this.configureIdentityNotifications(
        identity,
        bounceTopicArn,
        complaintTopicArn,
        deliveryTopicArn
      );
    }

    return {
      bounceTopicArn,
      complaintTopicArn,
      deliveryTopicArn,
      bounceSubscriptionArn,
      complaintSubscriptionArn,
      deliverySubscriptionArn,
    };
  }

  async cleanupTracking(config: {
    bounceTopicArn?: string;
    complaintTopicArn?: string;
    deliveryTopicArn?: string;
    bounceSubscriptionArn?: string;
    complaintSubscriptionArn?: string;
    deliverySubscriptionArn?: string;
  }, identities: string[]): Promise<void> {
    // Unsubscribe webhooks
    if (config.bounceSubscriptionArn) {
      try {
        await this.unsubscribeTopic(config.bounceSubscriptionArn);
      } catch (error) {
        console.error('Error unsubscribing bounce topic:', error);
      }
    }
    if (config.complaintSubscriptionArn) {
      try {
        await this.unsubscribeTopic(config.complaintSubscriptionArn);
      } catch (error) {
        console.error('Error unsubscribing complaint topic:', error);
      }
    }
    if (config.deliverySubscriptionArn) {
      try {
        await this.unsubscribeTopic(config.deliverySubscriptionArn);
      } catch (error) {
        console.error('Error unsubscribing delivery topic:', error);
      }
    }

    // Remove notifications from identities
    for (const identity of identities) {
      try {
        await this.configureIdentityNotifications(identity, '', '', '');
      } catch (error) {
        console.error(`Error removing notifications from ${identity}:`, error);
      }
    }

    // Delete topics
    if (config.bounceTopicArn) {
      try {
        await this.deleteTopic(config.bounceTopicArn);
      } catch (error) {
        console.error('Error deleting bounce topic:', error);
      }
    }
    if (config.complaintTopicArn) {
      try {
        await this.deleteTopic(config.complaintTopicArn);
      } catch (error) {
        console.error('Error deleting complaint topic:', error);
      }
    }
    if (config.deliveryTopicArn) {
      try {
        await this.deleteTopic(config.deliveryTopicArn);
      } catch (error) {
        console.error('Error deleting delivery topic:', error);
      }
    }
  }
}

export const snsService = new SNSService();
