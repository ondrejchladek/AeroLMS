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

  // Pro Neon používáme DATABASE_URL_NEON, pro SQL Server DATABASE_URL
  if (isNeon) {
    // Pro Neon musíme upravit DATABASE_URL pro Prisma
    process.env.DATABASE_URL = process.env.DATABASE_URL_NEON || '';
  }

  const logConfig =
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['query', 'info', 'warn', 'error'];

  // Log database connection info even in production for debugging
  console.log(`🗄️ Using ${isNeon ? 'Neon PostgreSQL' : 'SQL Server'} database`);
  console.log(`📊 DATABASE_URL set: ${isNeon ? 'DATABASE_URL_NEON' : 'DATABASE_URL'}`);
  
  if (isNeon && process.env.DATABASE_URL) {
    // Log first part of connection string for debugging (hide sensitive data)
    const url = process.env.DATABASE_URL;
    const sanitized = url.substring(0, url.indexOf('@') > 0 ? url.indexOf('@') : 30) + '...';
    console.log(`🔗 Connection: ${sanitized}`);
  }

  return new PrismaClient({
    log: logConfig as any
  });
};

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
