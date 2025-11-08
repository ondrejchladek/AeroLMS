import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer } from '@/types/roles';

// POST method removed - trainings are created only through automatic synchronization
// New trainings are added by adding three columns to User table:
// - {code}DatumPosl - Last completion date
// - {code}DatumPristi - Next due date
// - {code}Pozadovano - Required flag
// The app automatically detects these columns and creates Training records on startup or manual sync

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if admin or trainer request for all trainings from database
    const url = new URL(request.url);
    const isAdminOrTrainer =
      isAdmin(session.user.role) || isTrainer(session.user.role);
    if (url.searchParams.get('admin') === 'true' && isAdminOrTrainer) {
      const trainings = await prisma.training.findMany({
        include: {
          tests: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return NextResponse.json({
        trainings: trainings.map((t: any) => ({
          ...t,
          testsCount: t.tests.length
        }))
      });
    }
    // Získej data uživatele podle kódu nebo emailu
    let user;

    if (session.user.cislo) {
      // Uživatel přihlášen kódem
      user = await prisma.user.findUnique({
        where: {
          cislo: session.user.cislo
        }
      });
    } else if (session.user.email) {
      // Uživatel přihlášen emailem
      user = await prisma.user.findUnique({
        where: {
          email: session.user.email
        }
      });
    } else {
      return NextResponse.json(
        { error: 'User identifier not found' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Načti všechna školení z databáze
    const dbTrainings = await prisma.training.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    // Pro každé školení z databáze zkontroluj, zda je požadováno pro uživatele
    const trainings = dbTrainings.map((training: any) => {
      const slug = training.code.toLowerCase(); // Použij code jako slug
      // CRITICAL: Training columns have underscore prefix in database
      const pozadovano = Boolean(
        user[`_${training.code}Pozadovano` as keyof typeof user]
      );
      return {
        id: training.id,
        key: training.code,
        code: training.code,
        name: training.name,
        description: training.description,
        slug: slug,
        icon: 'post',
        required: pozadovano,
        url: `/${slug}`
      };
    });

    // Filtruj pouze požadovaná školení pro zobrazení v sidebaru
    const requiredTrainings = trainings.filter((t: any) => t.required);

    return NextResponse.json({
      trainings: requiredTrainings,
      allTrainings: trainings
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch trainings' },
      { status: 500 }
    );
  }
}
