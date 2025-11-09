// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // zabráníme duplikaci instancí v hot-reload režimu
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const logConfig =
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['query', 'info', 'warn', 'error'];

  return new PrismaClient({
    log: logConfig as any
  });
};

const prismaClient = global.prisma ?? createPrismaClient();

// Alias pro zpětnou kompatibilitu - kód může používat prisma.user místo prisma.inspiritCisZam
export const prisma = Object.assign(prismaClient, {
  user: prismaClient.inspiritCisZam
});

if (process.env.NODE_ENV !== 'production') global.prisma = prismaClient;
