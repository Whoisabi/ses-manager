# SES Manager - AWS Email Service GUI

## Overview

SES Manager is a secure fullstack web application that provides a comprehensive GUI for interacting with AWS Simple Email Service (SES). The application enables users to authenticate, manage AWS credentials, send emails (both single and bulk), track email performance metrics, and manage templates and recipient lists. It's built with a modern TypeScript stack featuring React frontend, Express.js backend, and PostgreSQL database with real-time email tracking capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Framework**: Radix UI primitives with shadcn/ui components for consistent design
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Authentication**: Context-based auth provider with protected routes

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful APIs with consistent error handling and validation
- **File Processing**: Multer for CSV uploads with streaming CSV parser

### Database Architecture
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with TypeScript schema definitions
- **Schema Design**: 
  - User management with encrypted password storage
  - AWS credentials with encrypted storage
  - Email campaigns, templates, and recipient lists
  - Email tracking events for opens, clicks, bounces, and complaints
  - Session storage for authentication

### Security Architecture
- **Password Security**: Scrypt-based password hashing with salt
- **Credential Encryption**: AES-256-GCM encryption for AWS credentials using session secret
- **Session Security**: Secure HTTP-only cookies with CSRF protection
- **Input Validation**: Zod schemas for runtime type checking and validation
- **Authentication**: Session-based auth with automatic logout on unauthorized access

### Email Service Architecture
- **AWS Integration**: AWS SES SDK for email sending capabilities
- **Email Tracking**: 
  - Tracking pixels for open tracking
  - Unique redirect links for click tracking
  - SNS integration for bounce/complaint notifications
- **Mass Mailing**: CSV-based recipient management with bulk sending capabilities
- **Template System**: Reusable email templates with variable substitution

### Development Architecture
- **Build System**: Vite for frontend, esbuild for backend bundling
- **Development Server**: Hot module replacement with proxy setup
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Package Management**: npm with lockfile for reproducible builds

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection via Neon
- **drizzle-orm**: TypeScript ORM for database operations
- **express**: Web application framework
- **passport**: Authentication middleware
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management

### AWS Integration
- **@aws-sdk/client-ses**: AWS Simple Email Service SDK for email operations

### UI and Styling
- **@radix-ui/***: Headless UI component primitives (20+ components)
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management
- **clsx**: Conditional CSS class utility

### Form and Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Runtime type validation and schema definition

### Development Tools
- **vite**: Frontend build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for development
- **@replit/***: Replit-specific development plugins

### Data Processing
- **csv-parser**: CSV file parsing for recipient lists
- **multer**: File upload middleware

### Security and Encryption
- **connect-pg-simple**: PostgreSQL session store
- **crypto**: Built-in Node.js encryption utilities

### Development and Replit Integration
- **@replit/vite-plugin-***: Replit-specific development tools for error handling and debugging