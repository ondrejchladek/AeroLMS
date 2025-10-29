import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer, ROLES } from '@/types/roles';

export async function GET(request: NextRequest) {
  try {
    // Ověření přihlášení
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kontrola oprávnění - admin nebo školitel
    const canViewUsers =
      isAdmin(session.user.role) || isTrainer(session.user.role);

    if (!canViewUsers) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Trainer access required' },
        { status: 403 }
      );
    }

    // Načíst uživatele - školitelé vidí pouze zaměstnance
    const whereClause = isTrainer(session.user.role)
      ? { role: ROLES.WORKER }
      : {};

    const users = await prisma.user.findMany({
      where: whereClause,
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
