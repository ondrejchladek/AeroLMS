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

  // Načti všechna školení z databáze pro použití v celé aplikaci
  const dbTrainings = await prisma.training.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // Vytvoř mapu code -> training pro rychlý přístup
  const trainingsByCode = dbTrainings.reduce((acc: any, training: any) => {
    acc[training.code] = training;
    return acc;
  }, {});

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
    const allTrainings = dbTrainings.map((training: any) => {
      // Dynamicky získej data o školení z databáze uživatele
      const lastDate = user[`${training.code}DatumPosl` as keyof typeof user] as Date | null;
      const nextDate = user[`${training.code}DatumPristi` as keyof typeof user] as Date | null;
      const required = Boolean(user[`${training.code}Pozadovano` as keyof typeof user]);

      return {
        key: training.code,
        name: training.name,
        slug: training.code.toLowerCase(), // Použij code jako slug
        required,
        lastDate,
        nextDate,
      };
    });

    // Spočítej statistiky ze skutečných dat
    const now = new Date();
    const requiredTrainings = allTrainings.filter((t: any) => t.required).length;
    const completedTrainings = allTrainings.filter((t: any) => t.lastDate !== null).length;
    const expiredTrainings = allTrainings.filter((t: any) => t.nextDate && new Date(t.nextDate) < now).length;
    const upcomingTrainings = allTrainings.filter((t: any) => {
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
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="text-blue-500">🔵</span>
                  Požadovaná školení
                </h3>
                <p className="text-2xl font-bold">{requiredTrainings}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="text-green-500">🟢</span>
                  Dokončená školení
                </h3>
                <p className="text-2xl font-bold text-green-600">{completedTrainings}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="text-red-500">🔴</span>
                  Prošlá školení
                </h3>
                <p className={`text-2xl font-bold ${expiredTrainings > 0 ? 'text-red-600' : ''}`}>
                  {expiredTrainings}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col space-y-1.5">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="text-yellow-500">🟡</span>
                  Blíží se konec platnosti
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
                trainings={allTrainings.map((t: any) => ({
                  name: t.name,
                  date: t.nextDate
                }))}
              />
            </div>
            <div className='col-span-4 md:col-span-3'>
              <RecentSales
                trainings={allTrainings.map((t: any) => ({
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

  // Použij code přímo jako slug (case-insensitive)
  const slug = node[0];
  const training = dbTrainings.find((t: any) => 
    t.code.toLowerCase() === slug.toLowerCase()
  );

  // Pokud slug neodpovídá žádnému školení, zobraz 404
  if (!training) {
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
    datumPosl: user[`${training.code}DatumPosl` as keyof typeof user] as Date | null,
    pozadovano: Boolean(user[`${training.code}Pozadovano` as keyof typeof user]),
    datumPristi: user[`${training.code}DatumPristi` as keyof typeof user] as Date | null,
  };

  // Načti detaily školení včetně testů
  const trainingWithTests = await prisma.training.findUnique({
    where: { code: training.code },
    include: {
      tests: {
        select: {
          id: true
        }
      }
    }
  });

  // Připrav data pro klienta
  const trainingForClient = trainingWithTests ? {
    id: trainingWithTests.id,
    code: trainingWithTests.code,
    name: trainingWithTests.name,
    description: trainingWithTests.description,
    content: trainingWithTests.content ? JSON.parse(trainingWithTests.content) : null,
    hasTest: trainingWithTests.tests.length > 0,
    testId: trainingWithTests.tests[0]?.id
  } : null;

  return (
    <PageContainer>
      <TrainingClient
        trainingData={trainingData}
        training={trainingForClient}
        displayName={training.name} // Použij name z databáze
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
  
  // Načti školení z databáze pro získání názvu
  // SQL Server automaticky dělá case-insensitive porovnání
  const training = await prisma.training.findFirst({
    where: {
      code: slug.toUpperCase() // Převeď na uppercase pro SQL Server
    }
  });

  const displayName = training ? training.name : 'Stránka';

  return {
    title: `${displayName} | AeroLMS`,
    description: `Informace o ${displayName}`
  };
}