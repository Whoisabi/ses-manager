import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for Replit environment
neonConfig.webSocketConstructor = ws;

// Configure SSL/TLS for WebSocket connections in Replit dev environment
if (process.env.NODE_ENV !== 'production' && (process.env.REPL_ID || process.env.REPL_SLUG)) {
  neonConfig.wsProxy = (host) => `${host}?sslmode=require&sslcheck=false`;
  console.warn('⚠️  Neon WebSocket SSL verification disabled for Replit development environment');
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure SSL for database connection
// Only disable certificate validation in Replit development environment
const sslConfig = (() => {
  if (process.env.NODE_ENV === 'production') {
    return true; // Use default SSL verification in production
  }
  
  // In development, only disable cert validation if in Replit environment
  if (process.env.REPL_ID || process.env.REPL_SLUG) {
    console.warn('⚠️  Database SSL certificate validation disabled for Replit development environment');
    return { rejectUnauthorized: false };
  }
  
  return true; // Use default SSL verification for local development
})();

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});
export const db = drizzle({ client: pool, schema });