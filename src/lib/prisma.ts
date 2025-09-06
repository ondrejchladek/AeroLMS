// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaClient as PrismaClientSQLite } from '../../prisma/generated/client-sqlite';

type PrismaClientType = PrismaClient | PrismaClientSQLite;

declare global {
  // zabráníme duplikaci instancí v hot-reload režimu
  // eslint-disable-next-line no-var
  var prisma: PrismaClientType | undefined;
}

const createPrismaClient = (): PrismaClientType => {
  const dbProvider = process.env.DB_PROVIDER || 'sqlserver';
  
  const logConfig = process.env.NODE_ENV === 'production'
    ? ['error'] as const
    : ['query', 'info', 'warn', 'error'] as const;

  if (dbProvider === 'sqlite') {
    console.log('🗄️ Using SQLite database');
    return new PrismaClientSQLite({
      log: logConfig
    });
  }
  
  console.log('🗄️ Using SQL Server database');
  return new PrismaClient({
    log: logConfig
  });
};

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
