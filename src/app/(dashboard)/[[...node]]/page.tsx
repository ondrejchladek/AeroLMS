import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PageContainer from '@/components/layout/page-container';
import { BarGraph } from '@/features/prehled/components/bar-graph';
import { RecentSales } from '@/features/prehled/components/recent-sales';
import { TrainingsTable } from '@/features/prehled/components/trainings-table';
import { TrainingClient } from './training-client';

import React from 'react';

// Mapping názvů školení na URL slug
const trainingNameToSlug = {
  CMM: 'cmm',
  EDM: 'edm',
  VizualniKontrola: 'vizualni-kontrola',
  Znaceni: 'znaceni',
  ZlomeniNastroje: 'zlomeni-nastroje',
  Vzorovani: 'vzorovani',
  UdrzbaStrojuPracovnikyDilny: 'udrzba-stroju-pracovniky-dilny',
  SystemmanagemenntuKvalityCilepodniku: 'system-managementu-kvality',
  SymbolyvBB: 'symboly-v-bb',
  SeriovaCisla: 'seriova-cisla',
  Samokontrola: 'samokontrola',
  RegulacniKarty: 'regulacni-karty',
  Pruvodka: 'pruvodka',
  PraceKonProdukt: 'prace-kon-produkt',
  PouzitiNatsroju: 'pouziti-nastroju',
  OpotrebeniNastrojuuCMT: 'opotrebeni-nastroju-cmt',
  MonitorVyraCMTDilu: 'monitor-vyra-cmt-dilu',
  Meridla: 'meridla',
  KnihaStroje: 'kniha-stroje',
  MerAVyhodOpotrebeni: 'mereni-vyhodnoceni-opotrebeni',
  PozdavkyEN10204Dodak: 'pozadavky-en10204',
  VrtaniKritDily: 'vrtani-krit-dily',
  ZkouskaTvrdosti: 'zkouska-tvrdosti',
  EleZnaceni: 'elektronicke-znaceni',
  TrideniOdpadu: 'trideni-odpadu',
  NakladaniLatkami: 'nakladani-latkami',
  ITBezpecnost: 'it-bezpecnost',
  RazK1K: 'raz-k1k',
  KontrPrijZboz: 'kontrola-prijateho-zbozi'
} as const;

// Inverted mapping pro získání názvu z URL
const slugToTrainingName = Object.entries(trainingNameToSlug).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {} as Record<string, string>
);

// Mapping názvů na user friendly názvy
const trainingDisplayNames: Record<string, string> = {
  CMM: 'CMM',
  EDM: 'EDM',
  VizualniKontrola: 'Vizuální kontrola',
  Znaceni: 'Značení',
  ZlomeniNastroje: 'Zlomení nástroje',
  Vzorovani: 'Vzorování',
  UdrzbaStrojuPracovnikyDilny: 'Údržba strojů pracovníky dílny',
  SystemmanagemenntuKvalityCilepodniku: 'Systém managementu kvality - cíle podniku',
  SymbolyvBB: 'Symboly v BB',
  SeriovaCisla: 'Sériová čísla',
  Samokontrola: 'Samokontrola',
  RegulacniKarty: 'Regulační karty',
  Pruvodka: 'Průvodka',
  PraceKonProdukt: 'Práce kon. produkt',
  PouzitiNatsroju: 'Použití nástrojů',
  OpotrebeniNastrojuuCMT: 'Opotřebení nástrojů u CMT',
  MonitorVyraCMTDilu: 'Monitor výroba CMT dílů',
  Meridla: 'Měřidla',
  KnihaStroje: 'Kniha stroje',
  MerAVyhodOpotrebeni: 'Měření a vyhodnocení opotřebení',
  PozdavkyEN10204Dodak: 'Požadavky EN10204 dodák',
  VrtaniKritDily: 'Vrtání krit. díly',
  ZkouskaTvrdosti: 'Zkouška tvrdosti',
  EleZnaceni: 'Elektronické značení',
  TrideniOdpadu: 'Třídění odpadu',
  NakladaniLatkami: 'Nakládání s látkami',
  ITBezpecnost: 'IT Bezpečnost',
  RazK1K: 'Raz K1K',
  KontrPrijZboz: 'Kontrola přijatého zboží'
};

interface PageProps {
  params: Promise<{
    node?: string[];
  }>;
}

export default async function DynamicPage({ params }: PageProps) {
  // Middleware zajišťuje, že sem přijde pouze přihlášený uživatel
  const session = await getServerSession(authOptions);

  const resolvedParams = await params;
  const node = resolvedParams.node || [];

  // Pokud není žádná cesta, zobraz přehled
  if (node.length === 0) {
    // Načti data přihlášeného uživatele
    let user;
    if (session!.user?.code) {
      user = await prisma.user.findUnique({
        where: { code: session!.user.code }
      });
    } else if (session!.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session!.user.email }
      });
    }

    if (!user) {
      redirect('/login');
    }

    // Připrav data všech školení pro tabulku ze skutečných dat uživatele
    const allTrainings = Object.entries(trainingNameToSlug).map(([key, slug]) => {
      // Dynamicky získej data o školení z databáze uživatele
      const lastDate = user[`${key}DatumPosl` as keyof typeof user] as Date | null;
      const nextDate = user[`${key}DatumPristi` as keyof typeof user] as Date | null;
      const required = Boolean(user[`${key}Pozadovano` as keyof typeof user]);

      return {
        key,
        name: trainingDisplayNames[key],
        slug,
        required,
        lastDate,
        nextDate,
      };
    });

    // Spočítej statistiky ze skutečných dat
    const now = new Date();
    const requiredTrainings = allTrainings.filter(t => t.required).length;
    const completedTrainings = allTrainings.filter(t => t.lastDate !== null).length;
    const expiredTrainings = allTrainings.filter(t => t.nextDate && new Date(t.nextDate) < now).length;
    const upcomingTrainings = allTrainings.filter(t => {
      if (!t.nextDate) return false;
      const nextDate = new Date(t.nextDate);
      const diffTime = nextDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    }).length;
    return (
      <PageContainer>
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Přehled</h1>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Vítejte v systému AeroLMS</h2>
            <p className="text-muted-foreground">
              Zde najdete přehled všech vašich školení a certifikací.
              V levém menu si můžete vybrat konkrétní školení pro zobrazení detailů.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Požadovaná školení
                </h3>
                <p className="text-2xl font-bold">{requiredTrainings}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Splněná školení (počet datum poslední)
                </h3>
                <p className="text-2xl font-bold">{completedTrainings}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Vypršelá školení (školení po datu příští)
                </h3>
                <p className={`text-2xl font-bold ${expiredTrainings > 0 ? 'text-red-600' : ''}`}>
                  {expiredTrainings}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Blížící se termíny (školení s datem přístí do 30 dní)
                </h3>
                <p className={`text-2xl font-bold ${upcomingTrainings > 0 ? 'text-orange-600' : ''}`}>
                  {upcomingTrainings}
                </p>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
            <div className='col-span-4'>
              <BarGraph
                trainings={allTrainings.map(t => ({
                  name: t.name,
                  date: t.nextDate
                }))}
              />
            </div>
            <div className='col-span-4 md:col-span-3'>
              <RecentSales
                trainings={allTrainings.map(t => ({
                  name: t.name,
                  lastDate: t.lastDate,
                  required: t.required
                }))}
              />
            </div>
          </div>

          {/* Tabulka školení */}
          <TrainingsTable trainings={allTrainings} />

        </div>
      </PageContainer>
    );
  }

  const slug = node[0];
  const trainingKey = slugToTrainingName[slug];

  // Pokud slug neodpovídá žádnému školení, zobraz 404
  if (!trainingKey) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="mt-2 text-muted-foreground">Stránka nenalezena</p>
        </div>
      </div>
    );
  }

  // Získej data uživatele včetně informací o školení
  // Middleware garantuje, že session existuje a obsahuje buď code nebo email
  let user;

  if (session!.user?.code) {
    // Uživatel přihlášen kódem
    user = await prisma.user.findUnique({
      where: {
        code: session!.user.code
      }
    });
  } else if (session!.user?.email) {
    // Uživatel přihlášen emailem
    user = await prisma.user.findUnique({
      where: {
        email: session!.user.email
      }
    });
  }

  if (!user) {
    // Uživatel byl pravděpodobně smazán z databáze po přihlášení
    redirect('/login');
  }

  // Dynamicky získej data o školení (bez podtržítek v názvech polí)
  const trainingData = {
    datumPosl: user[`${trainingKey}DatumPosl` as keyof typeof user] as Date | null,
    pozadovano: Boolean(user[`${trainingKey}Pozadovano` as keyof typeof user]),
    datumPristi: user[`${trainingKey}DatumPristi` as keyof typeof user] as Date | null,
  };

  const displayName = trainingDisplayNames[trainingKey];

  // Načti data o školení z databáze
  const training = await prisma.training.findUnique({
    where: { code: trainingKey },
    include: {
      tests: {
        select: {
          id: true
        }
      }
    }
  });

  // Připrav data pro klienta
  const trainingForClient = training ? {
    id: training.id,
    code: training.code,
    name: training.name,
    description: training.description,
    content: training.content ? JSON.parse(training.content) : null,
    hasTest: training.tests.length > 0,
    testId: training.tests[0]?.id
  } : null;

  return (
    <PageContainer>
      <TrainingClient
        trainingData={trainingData}
        training={trainingForClient}
        displayName={displayName}
      />
    </PageContainer>
  );
}

// Generuj metadata pro stránku
export async function generateMetadata({ params }: { params: Promise<{ node?: string[] }> }) {
  const resolvedParams = await params;
  const node = resolvedParams.node || [];

  if (node.length === 0) {
    return {
      title: 'AeroLMS',
      description: 'Systém pro správu školení'
    };
  }

  const slug = node[0];
  const trainingKey = slugToTrainingName[slug];
  const displayName = trainingDisplayNames[trainingKey] || 'Stránka';

  return {
    title: `${displayName} | AeroLMS`,
    description: `Informace o ${displayName}`
  };
}