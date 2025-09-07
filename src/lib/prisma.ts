// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaClient as PrismaClientNeon } from '../../prisma/generated/client-neon';

type PrismaClientType = PrismaClient | PrismaClientNeon;

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

  if (dbProvider === 'neon') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🗄️ Using Neon PostgreSQL database');
    }
    return new PrismaClientNeon({
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
