import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for Replit environment
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineTLS = true;
neonConfig.pipelineConnect = false;

// Configure TLS for different environments
if (process.env.NODE_ENV === 'development') {
  // For development, we may need to handle self-signed certificates
  // but only if explicitly configured
  if (process.env.ALLOW_SELF_SIGNED_CERTS === 'true') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
} else {
  // Production should always use proper TLS
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });