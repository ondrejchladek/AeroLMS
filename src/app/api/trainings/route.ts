import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Definice všech školení - dočasně inline, bude přesunuto do databáze
const trainingDefinitions = [
  { key: 'CMM', name: 'CMM', slug: 'cmm', icon: 'post' },
  { key: 'EDM', name: 'EDM', slug: 'edm', icon: 'post' },
  {
    key: 'VizualniKontrola',
    name: 'Vizuální kontrola',
    slug: 'vizualni-kontrola',
    icon: 'post'
  },
  { key: 'Znaceni', name: 'Značení', slug: 'znaceni', icon: 'post' },
  {
    key: 'ZlomeniNastroje',
    name: 'Zlomení nástroje',
    slug: 'zlomeni-nastroje',
    icon: 'post'
  },
  { key: 'Vzorovani', name: 'Vzorování', slug: 'vzorovani', icon: 'post' },
  {
    key: 'UdrzbaStrojuPracovnikyDilny',
    name: 'Údržba strojů pracovníky dílny',
    slug: 'udrzba-stroju-pracovniky-dilny',
    icon: 'post'
  },
  {
    key: 'SystemmanagemenntuKvalityCilepodniku',
    name: 'Systém managementu kvality',
    slug: 'system-managementu-kvality',
    icon: 'post'
  },
  {
    key: 'SymbolyvBB',
    name: 'Symboly v BB',
    slug: 'symboly-v-bb',
    icon: 'post'
  },
  {
    key: 'SeriovaCisla',
    name: 'Sériová čísla',
    slug: 'seriova-cisla',
    icon: 'post'
  },
  {
    key: 'Samokontrola',
    name: 'Samokontrola',
    slug: 'samokontrola',
    icon: 'post'
  },
  {
    key: 'RegulacniKarty',
    name: 'Regulační karty',
    slug: 'regulacni-karty',
    icon: 'post'
  },
  { key: 'Pruvodka', name: 'Průvodka', slug: 'pruvodka', icon: 'post' },
  {
    key: 'PraceKonProdukt',
    name: 'Práce kon. produkt',
    slug: 'prace-kon-produkt',
    icon: 'post'
  },
  {
    key: 'PouzitiNatsroju',
    name: 'Použití nástrojů',
    slug: 'pouziti-nastroju',
    icon: 'post'
  },
  {
    key: 'OpotrebeniNastrojuuCMT',
    name: 'Opotřebení nástrojů u CMT',
    slug: 'opotrebeni-nastroju-cmt',
    icon: 'post'
  },
  {
    key: 'MonitorVyraCMTDilu',
    name: 'Monitor výroba CMT dílů',
    slug: 'monitor-vyra-cmt-dilu',
    icon: 'post'
  },
  { key: 'Meridla', name: 'Měřidla', slug: 'meridla', icon: 'post' },
  {
    key: 'KnihaStroje',
    name: 'Kniha stroje',
    slug: 'kniha-stroje',
    icon: 'post'
  },
  {
    key: 'MerAVyhodOpotrebeni',
    name: 'Měření a vyhodnocení opotřebení',
    slug: 'mereni-vyhodnoceni-opotrebeni',
    icon: 'post'
  },
  {
    key: 'PozdavkyEN10204Dodak',
    name: 'Požadavky EN10204',
    slug: 'pozadavky-en10204',
    icon: 'post'
  },
  {
    key: 'VrtaniKritDily',
    name: 'Vrtání krit. díly',
    slug: 'vrtani-krit-dily',
    icon: 'post'
  },
  {
    key: 'ZkouskaTvrdosti',
    name: 'Zkouška tvrdosti',
    slug: 'zkouska-tvrdosti',
    icon: 'post'
  },
  {
    key: 'EleZnaceni',
    name: 'Elektronické značení',
    slug: 'elektronicke-znaceni',
    icon: 'post'
  },
  {
    key: 'TrideniOdpadu',
    name: 'Třídění odpadu',
    slug: 'trideni-odpadu',
    icon: 'post'
  },
  {
    key: 'NakladaniLatkami',
    name: 'Nakládání s látkami',
    slug: 'nakladani-latkami',
    icon: 'post'
  },
  {
    key: 'ITBezpecnost',
    name: 'IT Bezpečnost',
    slug: 'it-bezpecnost',
    icon: 'post'
  },
  { key: 'RazK1K', name: 'Raz K1K', slug: 'raz-k1k', icon: 'post' },
  {
    key: 'KontrPrijZboz',
    name: 'Kontrola přijatého zboží',
    slug: 'kontrola-prijateho-zbozi',
    icon: 'post'
  }
];

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
    const training = await prisma.training.create({
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
      const trainings = await prisma.training.findMany({
        include: {
          tests: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return NextResponse.json({
        trainings: trainings.map(t => ({
          ...t,
          testsCount: t.tests.length
        }))
      });
    }
    // Získej data uživatele podle kódu nebo emailu
    let user;
    
    if (session.user.code) {
      // Uživatel přihlášen kódem
      user = await prisma.user.findUnique({
        where: {
          code: session.user.code
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
      return NextResponse.json({ error: 'User identifier not found' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Pro každé školení zkontroluj, zda je požadováno (bez podtržítek v názvech polí)
    const trainings = trainingDefinitions.map((training) => {
      const pozadovano = Boolean(
        user[`${training.key}Pozadovano` as keyof typeof user]
      );
      return {
        ...training,
        required: pozadovano,
        url: `/${training.slug}`
      };
    });

    // Filtruj pouze požadovaná školení pro zobrazení v sidebaru
    const requiredTrainings = trainings.filter((t) => t.required);

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
