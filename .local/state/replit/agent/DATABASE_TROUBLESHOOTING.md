# Database Troubleshooting Guide

## Quick Fix for Common Database Issues

### Problem: "table public.users does not exist" or similar errors

This happens when:
1. Environment reset loses database state
2. Migrations create wrong table names (CamelCase instead of lowercase)
3. Missing tables not in original migration

### Automatic Solution (Preferred)
The `server/init-db.ts` script runs on every startup and should fix this automatically.

### Manual Solution (If Needed)

#### Step 1: Install Required Packages
```bash
npm install tsx cross-env
```

#### Step 2: Check Current Tables
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

#### Step 3: Rename CamelCase Tables (if present)
```sql
ALTER TABLE "User" RENAME TO users;
ALTER TABLE "AwsCredential" RENAME TO aws_credentials;
ALTER TABLE "EmailTemplate" RENAME TO email_templates;
ALTER TABLE "RecipientList" RENAME TO recipient_lists;
ALTER TABLE "Recipient" RENAME TO recipients;
ALTER TABLE "EmailCampaign" RENAME TO email_campaigns;
ALTER TABLE "EmailSend" RENAME TO email_sends;
ALTER TABLE "EmailTrackingEvent" RENAME TO email_tracking_events;
ALTER TABLE "Session" RENAME TO sessions;
```

#### Step 4: Create Missing Domain Tables
```sql
CREATE TABLE IF NOT EXISTS "public"."domains" (
  "id" VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" VARCHAR NOT NULL,
  "domain" VARCHAR UNIQUE NOT NULL,
  "status" VARCHAR DEFAULT 'pending' NOT NULL,
  "verification_token" VARCHAR,
  "created_at" TIMESTAMP(6) DEFAULT now(),
  "updated_at" TIMESTAMP(6) DEFAULT now(),
  CONSTRAINT "fk_domains_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."dns_records" (
  "id" VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  "domain_id" VARCHAR NOT NULL,
  "record_type" VARCHAR NOT NULL,
  "record_name" VARCHAR NOT NULL,
  "record_value" VARCHAR NOT NULL,
  "purpose" VARCHAR NOT NULL,
  "created_at" TIMESTAMP(6) DEFAULT now(),
  CONSTRAINT "fk_dns_records_domain" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."bounce_complaint_events" (
  "id" VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
  "email_send_id" VARCHAR,
  "event_type" VARCHAR NOT NULL,
  "bounce_type" VARCHAR,
  "recipient_email" VARCHAR NOT NULL,
  "domain" VARCHAR,
  "reason" VARCHAR,
  "diagnostic_code" VARCHAR,
  "timestamp" TIMESTAMP(6) DEFAULT now(),
  "raw_data" JSONB,
  CONSTRAINT "fk_bounce_complaint_events_email_send" FOREIGN KEY ("email_send_id") REFERENCES "public"."email_sends"("id") ON DELETE CASCADE
);
```

#### Step 5: Regenerate Prisma Client
```bash
npx prisma generate
```

#### Step 6: Restart Workflow
The workflow will automatically restart, or restart manually.

### Verification Checklist
- [ ] tsx package installed
- [ ] cross-env package installed
- [ ] All 12 tables exist in lowercase
- [ ] Prisma client regenerated
- [ ] Workflow running on port 5000
- [ ] Homepage displays correctly

### Expected Tables (all lowercase)
1. users
2. aws_credentials
3. email_templates
4. recipient_lists
5. recipients
6. email_campaigns
7. email_sends
8. email_tracking_events
9. sessions
10. domains
11. dns_records
12. bounce_complaint_events
13. _prisma_migrations (system table)

### Root Cause
The original Prisma migration (`20250925121159_init`) creates tables with CamelCase names (User, AwsCredential, etc.), but the Prisma schema uses `@@map()` directives to map models to lowercase table names. This mismatch causes the "table does not exist" errors.

Additionally, three tables (domains, dns_records, bounce_complaint_events) were added to the Prisma schema later but never had a migration created, so they don't exist after fresh migrations.

### Prevention
The `server/init-db.ts` script was created to automatically:
1. Check for table existence
2. Apply migrations if needed
3. Rename tables if CamelCase detected
4. Create missing tables
5. Regenerate Prisma client

This runs before every server start, ensuring the database is always in the correct state.
