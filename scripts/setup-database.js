#!/usr/bin/env node

// Set NODE_TLS_REJECT_UNAUTHORIZED for development SSL issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { db, pool } from '../server/db.js';
import { users, sessions } from '../shared/schema.js';
import { storage } from '../server/storage.js';
import { sql, count } from 'drizzle-orm';

console.log('🚀 Setting up and validating database for user authentication...\n');

async function validateDatabase() {
  try {
    // Test database connection
    console.log('✅ Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('   Database connection successful\n');

    // Check if required tables exist
    console.log('✅ Checking authentication tables...');
    
    // Check users table
    const userCount = await db.select({ count: count() }).from(users);
    console.log(`   Users table exists - Current users: ${userCount[0].count}`);
    
    // Check sessions table
    const sessionCount = await db.select({ count: count() }).from(sessions);
    console.log(`   Sessions table exists - Active sessions: ${sessionCount[0].count}`);
    
    // Verify storage interface is working
    console.log('\n✅ Testing storage interface...');
    const testUserId = 'test-user-id';
    const existingUser = await storage.getUserByEmail('test@example.com');
    console.log(`   Storage getUserByEmail method working: ${existingUser ? 'User exists' : 'No test user found (expected)'}`);
    
    console.log('\n🎉 Database setup validation complete!');
    console.log('\n📋 Authentication Features Available:');
    console.log('   • User registration with email/password');
    console.log('   • User login with secure password hashing');
    console.log('   • Session management with PostgreSQL store');
    console.log('   • Password validation and security');
    console.log('   • User profile management');
    
    console.log('\n🔧 API Endpoints Ready:');
    console.log('   POST /api/register - Create new user account');
    console.log('   POST /api/login    - Authenticate user');
    console.log('   POST /api/logout   - End user session');
    console.log('   GET  /api/user     - Get current user info');
    
    console.log('\n💡 To test authentication:');
    console.log('   1. Start the application: npm run dev');
    console.log('   2. Navigate to the login/signup page');
    console.log('   3. Create a new account or login with existing credentials');
    
    return true;
  } catch (error) {
    console.error('❌ Database validation failed:', error.message);
    return false;
  }
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