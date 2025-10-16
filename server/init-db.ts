import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function fixDatabaseSchema(prisma: PrismaClient) {
  console.log('🔧 Checking and fixing database schema...');
  
  try {
    // Check if tables need renaming (CamelCase to lowercase)
    const { rows: camelCaseTables } = await prisma.$queryRawUnsafe<any>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('User', 'AwsCredential', 'EmailTemplate', 'RecipientList', 'Recipient', 'EmailCampaign', 'EmailSend', 'EmailTrackingEvent', 'Session')
    `);
    
    if (camelCaseTables.length > 0) {
      console.log('⚠️  Found CamelCase tables, renaming to lowercase...');
      
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "User" RENAME TO users`);
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "AwsCredential" RENAME TO aws_credentials`);
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "EmailTemplate" RENAME TO email_templates`);
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "RecipientList" RENAME TO recipient_lists`);
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "Recipient" RENAME TO recipients`);
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "EmailCampaign" RENAME TO email_campaigns`);
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "EmailSend" RENAME TO email_sends`);
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "EmailTrackingEvent" RENAME TO email_tracking_events`);
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "Session" RENAME TO sessions`);
      
      console.log('✅ Tables renamed to lowercase');
    }
    
    // Check and add missing user_id column to email_sends
    const { rows: emailSendsColumns } = await prisma.$queryRawUnsafe<any>(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'email_sends' AND column_name = 'user_id'
    `);
    
    if (emailSendsColumns.length === 0) {
      console.log('⚠️  Adding missing user_id column to email_sends...');
      await prisma.$executeRawUnsafe(`ALTER TABLE email_sends ADD COLUMN user_id VARCHAR`);
      await prisma.$executeRawUnsafe(`ALTER TABLE email_sends ADD CONSTRAINT email_sends_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
      console.log('✅ Added user_id column to email_sends');
    }
    
    // Make campaign_id nullable in email_sends
    const { rows: campaignIdInfo } = await prisma.$queryRawUnsafe<any>(`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'email_sends' AND column_name = 'campaign_id'
    `);
    
    if (campaignIdInfo.length > 0 && campaignIdInfo[0].is_nullable === 'NO') {
      console.log('⚠️  Making campaign_id nullable in email_sends...');
      await prisma.$executeRawUnsafe(`ALTER TABLE email_sends DROP CONSTRAINT IF EXISTS "EmailSend_campaign_id_fkey"`);
      await prisma.$executeRawUnsafe(`ALTER TABLE email_sends DROP CONSTRAINT IF EXISTS "email_sends_campaign_id_fkey"`);
      await prisma.$executeRawUnsafe(`ALTER TABLE email_sends ALTER COLUMN campaign_id DROP NOT NULL`);
      await prisma.$executeRawUnsafe(`ALTER TABLE email_sends ADD CONSTRAINT email_sends_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE`);
      console.log('✅ Made campaign_id nullable in email_sends');
    }
    
    // Create missing tables if they don't exist
    const { rows: domainTable } = await prisma.$queryRawUnsafe<any>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'domains'
    `);
    
    if (domainTable.length === 0) {
      console.log('⚠️  Creating missing domains table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE domains (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
          domain VARCHAR NOT NULL,
          status VARCHAR NOT NULL,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verification_token VARCHAR
        )
      `);
      console.log('✅ Created domains table');
    }
    
    const { rows: dnsRecordsTable } = await prisma.$queryRawUnsafe<any>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'dns_records'
    `);
    
    if (dnsRecordsTable.length === 0) {
      console.log('⚠️  Creating missing dns_records table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE dns_records (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
          domain_id VARCHAR NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
          record_type VARCHAR NOT NULL,
          record_name VARCHAR NOT NULL,
          record_value VARCHAR NOT NULL,
          purpose VARCHAR NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created dns_records table');
    }
    
    const { rows: bounceComplaintTable } = await prisma.$queryRawUnsafe<any>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'bounce_complaint_events'
    `);
    
    if (bounceComplaintTable.length === 0) {
      console.log('⚠️  Creating missing bounce_complaint_events table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE bounce_complaint_events (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
          email_send_id VARCHAR NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
          event_type VARCHAR NOT NULL,
          recipient VARCHAR NOT NULL,
          reason VARCHAR,
          bounce_type VARCHAR,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created bounce_complaint_events table');
    }
    
    console.log('✅ Database schema fixes complete');
  } catch (error) {
    console.error('⚠️  Error fixing schema:', error);
    // Don't fail the whole init if fixes fail - database might already be correct
  }
}

async function initDatabase() {
  console.log('🔄 Checking database initialization...');
  
  try {
    const prisma = new PrismaClient();
    
    // Always run schema fixes on every startup
    await fixDatabaseSchema(prisma);
    
    await prisma.$queryRaw`SELECT 1 FROM users LIMIT 1`;
    console.log('✅ Database is ready');
    await prisma.$disconnect();
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('⚠️  Database tables not found. Running migrations...');
      
      try {
        await execAsync('npx prisma migrate deploy');
        console.log('✅ Database migrations completed successfully');
      } catch (migrationError: any) {
        if (migrationError.message?.includes('P3005') || migrationError.message?.includes('not empty')) {
          console.log('⚠️  Database schema exists but migration history is missing');
          console.log('📝 Marking migration as applied...');
          
          await execAsync('npx prisma migrate resolve --applied 20250925121159_init');
          console.log('✅ Migration marked as applied');
        } else {
          throw migrationError;
        }
      }
      
      // Fix schema issues after migration
      const prismaFix = new PrismaClient();
      await fixDatabaseSchema(prismaFix);
      await prismaFix.$disconnect();
      
      console.log('🔄 Regenerating Prisma client...');
      await execAsync('npx prisma generate');
      console.log('✅ Prisma client regenerated');
      
      const prismaCheck = new PrismaClient();
      await prismaCheck.$queryRaw`SELECT 1 FROM users LIMIT 1`;
      await prismaCheck.$disconnect();
      console.log('✅ Database initialization complete');
    } else {
      throw error;
    }
  }
}

initDatabase()
  .then(() => {
    console.log('✅ Database ready');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  });
