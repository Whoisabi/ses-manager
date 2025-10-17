# SES Manager

A comprehensive AWS SES (Simple Email Service) management platform for sending, tracking, and analyzing email campaigns.

## Features

- 📧 **Email Campaign Management** - Create and manage email campaigns with templates
- 📊 **Analytics & Tracking** - Track delivery, opens, clicks, bounces, and complaints
- 👥 **Recipient List Management** - Import and manage recipient lists via CSV
- 🔐 **AWS SES Integration** - Direct integration with AWS SES for reliable email delivery
- 📈 **Real-time Dashboard** - Monitor email performance with interactive charts
- ⚙️ **Configuration Sets** - Set up email event tracking with AWS SNS
- 🌐 **Domain Management** - Verify and manage email sending domains with DNS records

## Prerequisites

Before running this application locally, ensure you have:

- **Node.js** (v18 or later)
- **PostgreSQL** (v14 or later)
- **AWS Account** with SES access
- **npm** or **yarn** package manager

## Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ses-manager
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

Create a PostgreSQL database for the application:

```bash
# Using psql
createdb ses_manager

# Or using PostgreSQL client
psql -U postgres
CREATE DATABASE ses_manager;
```

### 4. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

**Generate a secure SESSION_SECRET:**

```bash
# Generate a random 32-byte hex string for SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edit `.env` and set the required values:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://username:password@localhost:5432/ses_manager"

# Session & Encryption Secret (REQUIRED)
# This secret is used for both session management and encrypting AWS credentials
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="your-secure-random-string-here"

# AWS Credentials (REQUIRED for email functionality)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"

# Server Configuration
NODE_ENV="development"
PORT=5000
```

### 5. Initialize the Database

The database will be automatically initialized when you start the application. The init script will:
- Run Prisma migrations
- Create all necessary tables
- Set up proper schema relationships

### 6. Start the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:5000`

## AWS SES Configuration

### 1. Verify Email Addresses/Domains

Before sending emails, you need to verify your sender email addresses or domains in AWS SES:

1. Go to AWS SES Console → Verified Identities
2. Click "Create Identity"
3. Choose Email Address or Domain
4. Follow the verification process

### 2. Set Up Email Tracking (Optional but Recommended)

To track email events (delivery, opens, clicks, bounces, complaints):

#### Option A: Using Configuration Sets (Recommended)

1. In the SES Manager app, go to **Configuration Sets**
2. Create a new configuration set
3. Provide an SNS Topic ARN (you'll need to create an SNS topic in AWS)
4. Enable Open and Click tracking
5. Use this configuration set when sending emails

#### Option B: Manual AWS Setup

1. **Create SNS Topic** in AWS SNS Console
2. **Subscribe to Topic** with the webhook URL: `https://your-domain.com/api/sns/notifications`
3. **Confirm Subscription** when you receive the confirmation request
4. **Configure SES** to publish events to your SNS topic

### 3. Email Tracking Setup Details

The application supports comprehensive email tracking:

#### Delivery Tracking
- Automatically tracked via AWS SNS notifications
- Updates email status to "delivered" when confirmed

#### Open Tracking
- Uses invisible tracking pixels embedded in emails
- Fires when recipient opens the email
- Tracks first open only (prevents duplicate counts)

#### Click Tracking
- Wraps all links in emails with tracking URLs
- Redirects through `/api/tracking/click` endpoint
- Records click events and redirects to original URL

#### Bounce & Complaint Tracking
- Receives notifications from AWS SNS
- Records bounce type (hard/soft) and reason
- Tracks spam complaints automatically

## Analytics Dashboard

The analytics page provides comprehensive email performance metrics:

### Key Metrics
- **Total Sent** - All emails sent through the platform
- **Delivery Rate** - Percentage of successfully delivered emails
- **Open Rate** - Percentage of delivered emails that were opened
- **Click Rate** - Percentage of opened emails with click activity
- **Bounce Rate** - Percentage of emails that bounced

### Time-Series Charts
- Email performance over time (7/30/90 day views)
- Delivery and engagement rate trends
- Bounce and complaint monitoring

### How It Works

1. **Email Sent** → Status: `sent`, tracking pixel & click tracking added
2. **AWS Delivers** → SNS notification → Status: `delivered`
3. **Recipient Opens** → Pixel loads → Event: `open`, timestamp recorded
4. **Recipient Clicks** → Link redirect → Event: `click`, timestamp recorded
5. **Email Bounces** → SNS notification → Event: `bounce`, reason recorded
6. **Spam Complaint** → SNS notification → Event: `complaint`, recorded

All events are stored in the database and aggregated for the analytics dashboard.

## Project Structure

```
ses-manager/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Backend Express application
│   ├── services/          # Business logic services
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database interface
│   ├── init-db.ts         # Database initialization
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
│   ├── schema.ts          # Drizzle/Prisma schema
│   └── types.ts           # TypeScript types
├── prisma/                # Prisma migrations
│   └── migrations/
└── .env                   # Environment variables (create from .env.example)
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Run TypeScript type checking

## Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Shadcn/UI** - Component library
- **TanStack Query** - Data fetching & caching
- **Recharts** - Data visualization

### Backend
- **Express** - Web server
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **AWS SDK** - SES & SNS integration
- **Passport** - Authentication

## Troubleshooting

### Database Issues

If you encounter database errors:

```bash
# Reset the database
dropdb ses_manager
createdb ses_manager

# Restart the application (migrations run automatically)
npm run dev
```

### AWS SES Sandbox Mode

If you're in SES sandbox mode:
- You can only send to verified email addresses
- You have sending limits (200 emails/day, 1 email/second)
- Request production access in AWS SES Console to lift restrictions

### Tracking Not Working

1. Verify SNS topic is correctly configured
2. Check webhook URL is publicly accessible
3. Confirm subscription to SNS topic
4. Check `/api/webhook-logs` for incoming notifications
5. Ensure configuration set is attached to emails

### Environment Resets (Replit-specific)

The application includes automatic database recovery:
- Database schema is checked and fixed on every startup
- Missing tables are automatically created
- CamelCase tables are renamed to lowercase
- No manual intervention needed after environment resets

## Security Notes

- Never commit `.env` file to version control
- Use strong `SESSION_SECRET` in production
- Rotate AWS credentials regularly
- Keep dependencies updated
- Use HTTPS in production

## License

MIT

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review AWS SES documentation
3. Check application logs for error details
