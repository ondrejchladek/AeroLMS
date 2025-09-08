// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // zabráníme duplikaci instancí v hot-reload režimu
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const dbProvider = process.env.DB_PROVIDER || 'sqlserver';
  const isNeon = dbProvider === 'neon';

  const logConfig =
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['query', 'info', 'warn', 'error'];

  // Log database connection info
  console.log(`🗄️ Using ${isNeon ? 'Neon PostgreSQL' : 'SQL Server'} database`);
  console.log(`📊 Environment: DB_PROVIDER=${dbProvider}`);
  console.log(`📊 DATABASE_URL_NEON exists: ${!!process.env.DATABASE_URL_NEON}`);
  console.log(`📊 DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

  return new PrismaClient({
    log: logConfig as any
  });
};

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
