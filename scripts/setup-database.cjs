#!/usr/bin/env node

// Set NODE_TLS_REJECT_UNAUTHORIZED for development SSL issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set in .env');
  process.exit(1);
}

const createDbSql = `CREATE DATABASE ses_manager_db;`;

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aws_credentials (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region VARCHAR NOT NULL,
  encrypted_access_key TEXT NOT NULL,
  encrypted_secret_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipient_lists (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id VARCHAR NOT NULL REFERENCES recipient_lists(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  metadata JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  content TEXT NOT NULL,
  template_id VARCHAR REFERENCES email_templates(id),
  recipient_list_id VARCHAR REFERENCES recipient_lists(id),
  status VARCHAR NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_sends (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR REFERENCES email_campaigns(id) ON DELETE CASCADE,
  recipient_email VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  message_id VARCHAR,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  complained_at TIMESTAMP,
  bounce_reason TEXT,
  complaint_reason TEXT,
  tracking_pixel_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_tracking_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id VARCHAR NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
`;

async function setupDatabase() {
  // Connect to default db to create ses_manager_db if not exists
  const adminClient = new Client({
    connectionString: dbUrl.replace(/\/ses_manager_db$/, '/postgres'),
  });
  await adminClient.connect();
  try {
    await adminClient.query(createDbSql);
    console.log('Database ses_manager_db created');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database ses_manager_db already exists');
    } else {
      throw err;
    }
  }
  await adminClient.end();

  // Connect to ses_manager_db and create tables
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query(schemaSql);
  await client.end();
  console.log('Database schema setup complete');
}

async function validateDatabase() {
  // ...existing code...
}

async function createSampleUser() {
  try {
    console.log('\n🧪 Testing user creation...');
    
    // Check if sample user already exists
    const existingUser = await storage.getUserByEmail('demo@example.com');
    if (existingUser) {
      console.log('   Sample user already exists: demo@example.com');
      return;
    }
    
    // Create a sample user (password will be hashed automatically by the auth system)
    console.log('   Creating sample user: demo@example.com');
    console.log('   Note: Use the registration API endpoint to create users with proper password hashing');
    console.log('   Sample user creation skipped - use /api/register endpoint instead');
    
  } catch (error) {
    console.log('   Sample user creation info:', error.message);
  }
}

async function showDatabaseSchema() {
  console.log('\n📊 Database Schema Overview:');
  console.log('   • users: User accounts with encrypted passwords');
  console.log('   • sessions: Session storage for authentication');
  console.log('   • aws_credentials: Encrypted AWS credentials per user');
  console.log('   • email_templates: User email templates');
  console.log('   • recipient_lists: Email recipient management');
  console.log('   • recipients: Individual email recipients');
  console.log('   • email_campaigns: Email marketing campaigns');
  console.log('   • email_sends: Individual email send records');
  console.log('   • email_tracking_events: Email engagement tracking');
}

async function main() {
  try {
    const isValid = await validateDatabase();
    
    if (isValid) {
      await createSampleUser();
      await showDatabaseSchema();
      
      console.log('\n✨ Database is ready for user authentication!');
      console.log('   Your email marketing application with authentication is fully configured.');
    }
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    process.exit(0);
  }
}

// Run the setup
main();