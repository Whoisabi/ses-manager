import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function initDatabase() {
  console.log('🔄 Checking database initialization...');
  
  try {
    const prisma = new PrismaClient();
    
    await prisma.$queryRaw`SELECT 1 FROM users LIMIT 1`;
    console.log('✅ Database is already initialized');
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
