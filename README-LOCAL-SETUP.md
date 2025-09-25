# Local Development Setup - Windows

## Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL 12+** installed locally OR access to a cloud PostgreSQL database

## Quick Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

**Option A: Local PostgreSQL**
1. Install PostgreSQL on Windows: https://www.postgresql.org/download/windows/
2. Create a database named `ses_manager`:
   ```sql
   CREATE DATABASE ses_manager;
   ```
3. Create a `.env` file (copy from `.env.example`):
   ```
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ses_manager"
   SESSION_SECRET="your-random-secret-key-here"
   ```

**Option B: Free Cloud Database (Neon, Supabase, etc.)**
1. Create a free PostgreSQL database at:
   - [Neon.tech](https://neon.tech) (recommended)
   - [Supabase](https://supabase.com)
   - [ElephantSQL](https://www.elephantsql.com)
2. Copy the connection string to `.env`:
   ```
   DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
   SESSION_SECRET="your-random-secret-key-here"
   ```

### 3. Initialize Database Schema
```bash
npm run db:push
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Troubleshooting

**Database Connection Issues:**
- Make sure PostgreSQL is running (if using local setup)
- Verify DATABASE_URL format is correct
- Check username, password, and database name

**Port Issues:**
- Default port is 5000, make sure it's not in use
- Check Windows Firewall settings if needed

**PowerShell Script Execution:**
If you get execution policy errors, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```