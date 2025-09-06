import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  if (session.user.email !== 'test@test.cz') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { code, name, description, content } = body;

    // Create the training in database
    const training = await (prisma as any).training.create({
      data: {
        code: code || name.toUpperCase().replace(/\s+/g, '_'),
        name,
        description,
        content
      }
    });

    return NextResponse.json({ training });
  } catch (error) {
    console.error('Error creating training:', error);
    return NextResponse.json(
      { error: 'Failed to create training' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if admin request for all trainings from database
    const url = new URL(request.url);
    if (url.searchParams.get('admin') === 'true' && session.user.email === 'test@test.cz') {
      const trainings = await (prisma as any).training.findMany({
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
    
    if (session.user.code) {
      // Uživatel přihlášen kódem
      user = await (prisma as any).user.findUnique({
        where: {
          code: session.user.code
        }
      });
    } else if (session.user.email) {
      // Uživatel přihlášen emailem
      user = await (prisma as any).user.findUnique({
        where: {
          email: session.user.email
        }
      });
    } else {
      return NextResponse.json({ error: 'User identifier not found' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Načti všechna školení z databáze
    const dbTrainings = await (prisma as any).training.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    // Pro každé školení z databáze zkontroluj, zda je požadováno pro uživatele
    const trainings = dbTrainings.map((training: any) => {
      const slug = training.code.toLowerCase(); // Použij code jako slug
      const pozadovano = Boolean(
        user[`${training.code}Pozadovano` as keyof typeof user]
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
    console.error('Error fetching trainings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainings' },
      { status: 500 }
    );
  }
}
