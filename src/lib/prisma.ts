// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // zabráníme duplikaci instancí v hot-reload režimu
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const dbProvider = process.env.DB_PROVIDER || 'sqlserver';

  const logConfig =
    process.env.NODE_ENV === 'production'
      ? ['error']
      : ['query', 'info', 'warn', 'error'];

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🗄️ Using ${dbProvider === 'neon' ? 'Neon PostgreSQL' : 'SQL Server'} database`);
  }

  return new PrismaClient({
    log: logConfig as any
  });
};

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
