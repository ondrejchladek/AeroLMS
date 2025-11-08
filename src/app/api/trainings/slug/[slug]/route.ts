import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special chars with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    // First try to find by direct code match
    const trainingByCode = await prisma.training.findUnique({
      where: { code: slug.toUpperCase() },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      }
    });

    if (trainingByCode) {
      return NextResponse.json(trainingByCode);
    }

    // If not found by code, load all trainings and compare slugs
    const allTrainings = await prisma.training.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      }
    });

    // Find training whose slug matches the URL
    for (const training of allTrainings) {
      const trainingSlug = slugify(training.name);
      if (trainingSlug === slug || training.code.toLowerCase() === slug) {
        return NextResponse.json(training);
      }
    }

    // Also check common mappings (for backward compatibility)
    const commonMappings: Record<string, string> = {
      cmm: 'CMM',
      edm: 'EDM',
      'vizualni-kontrola': 'VizualniKontrola',
      znaceni: 'Znaceni',
      'zlomeni-nastroje': 'ZlomeniNastroje',
      vzorovani: 'Vzorovani',
      'udrzba-stroju-pracovniky-dilny': 'UdrzbaStrojuPracovnikyDilny',
      'system-managementu-kvality': 'SystemmanagemenntuKvalityCilepodniku',
      'symboly-v-bb': 'SymbolyvBB',
      'seriova-cisla': 'SeriovaCisla',
      samokontrola: 'Samokontrola',
      'regulacni-karty': 'RegulacniKarty',
      pruvodka: 'Pruvodka',
      'prace-kon-produkt': 'PraceKonProdukt',
      'pouziti-nastroju': 'PouzitiNatsroju',
      'opotrebeni-nastroju-cmt': 'OpotrebeniNastrojuuCMT',
      'monitor-vyra-cmt-dilu': 'MonitorVyraCMTDilu',
      meridla: 'Meridla',
      'kniha-stroje': 'KnihaStroje',
      'mereni-vyhodnoceni-opotrebeni': 'MerAVyhodOpotrebeni'
    };

    const mappedCode = commonMappings[slug];
    if (mappedCode) {
      const trainingByMappedCode = await prisma.training.findUnique({
        where: { code: mappedCode },
        select: {
          id: true,
          name: true,
          code: true,
          description: true
        }
      });

      if (trainingByMappedCode) {
        return NextResponse.json(trainingByMappedCode);
      }
    }

    return NextResponse.json({ error: 'Training not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
