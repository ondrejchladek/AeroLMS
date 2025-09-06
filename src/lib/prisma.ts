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
    ? ['error']
    : ['query', 'info', 'warn', 'error'];

  if (dbProvider === 'sqlite') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🗄️ Using SQLite database');
    }
    return new PrismaClientSQLite({
      log: logConfig as any
    });
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('🗄️ Using SQL Server database');
  }
  return new PrismaClient({
    log: logConfig as any
  });
};

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
