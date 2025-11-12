import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer, ROLES } from '@/types/roles';

export async function GET() {
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
    // IMPORTANT: Use raw SQL to get dynamic training columns (_*Pozadovano, _*DatumPosl, _*DatumPristi)
    let rawUsers: any[];

    if (isTrainer(session.user.role)) {
      // Školitelé vidí pouze WORKER
      rawUsers = await prisma.$queryRaw<any[]>`
        SELECT * FROM InspiritCisZam
        WHERE role = ${ROLES.WORKER}
        ORDER BY Cislo ASC
      `;
    } else {
      // Admins vidí všechny uživatele
      rawUsers = await prisma.$queryRaw<any[]>`
        SELECT * FROM InspiritCisZam
        ORDER BY Cislo ASC
      `;
    }

    // Transform to match expected field names (Czech DB columns -> English JS names)
    const users = rawUsers.map((user) => ({
      ...user,
      id: user.ID,
      cislo: user.Cislo,
      firstName: user.Jmeno,
      lastName: user.Prijmeni,
      email: user.email,
      role: user.role
    }));

    return NextResponse.json({
      users,
      count: users.length
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
