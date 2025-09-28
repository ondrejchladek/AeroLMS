import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/types/roles';

export async function GET(request: NextRequest) {
  try {
    // Ověření přihlášení a admin práv
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Kontrola admin práv pomocí role
    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Načíst všechny uživatele
    const users = await prisma.user.findMany({
      orderBy: {
        code: 'asc'
      }
    });

    return NextResponse.json({
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}