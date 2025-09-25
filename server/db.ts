import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for development environment
neonConfig.webSocketConstructor = ws;

// Disable SSL verification for development (Replit environment)
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}?sslmode=disable`;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with SSL settings for development
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false
};

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });