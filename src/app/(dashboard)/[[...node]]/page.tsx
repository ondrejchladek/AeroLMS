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
  const dbTrainings = await prisma.inspiritTraining.findMany({
    where: { deletedAt: null },
    orderBy: {
      name: 'asc'
    }
  });

  // Pokud není žádná cesta, zobraz přehled
  if (node.length === 0) {
    // Načti data přihlášeného uživatele
    // IMPORTANT: Použij raw SQL aby se načetly i dynamické sloupce školení (_*Pozadovano, _*DatumPosl, _*DatumPristi)
    let user: any;
    if (session!.user?.cislo) {
      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM InspiritCisZam WHERE Cislo = ${session!.user.cislo}
      `;
      user = result[0];
    } else if (session!.user?.email) {
      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM InspiritCisZam WHERE email = ${session!.user.email}
      `;
      user = result[0];
    }

    if (!user) {
      redirect('/login');
    }

    // RBAC: Pro WORKER načti seznam školení s přiřazeným školitelem
    // Školení bez školitele se workerům nezobrazují
    const trainingsWithTrainer = await prisma.inspiritTrainingAssignment.findMany({
      where: {
        deletedAt: null
      },
      select: {
        trainingId: true
      }
    });
    const trainingsWithTrainerIds = new Set(trainingsWithTrainer.map(t => t.trainingId));

    // Připrav data všech školení pro tabulku ze skutečných dat uživatele
    const allTrainings = dbTrainings.map((training: any) => {
      // Dynamicky získej data o školení z databáze uživatele
      // CRITICAL: Training columns have underscore prefix in database
      const lastDate = user[
        `_${training.code}DatumPosl` as keyof typeof user
      ] as Date | null;
      const nextDate = user[
        `_${training.code}DatumPristi` as keyof typeof user
      ] as Date | null;
      const required = Boolean(
        user[`_${training.code}Pozadovano` as keyof typeof user]
      );

      return {
        id: training.id,
        key: training.code,
        name: training.name,
        slug: training.code.toLowerCase(), // Použij code jako slug
        required,
        lastDate,
        nextDate
      };
    });

    // Filtruj školení - všechny role vidí pouze svá požadovaná školení s přiřazeným školitelem
    const filteredTrainings = allTrainings.filter(
      (t: any) => t.required && trainingsWithTrainerIds.has(t.id)
    );

    // Spočítej statistiky ze skutečných dat (podle role - WORKER vidí jen požadovaná)
    const now = new Date();
    const requiredTrainings = filteredTrainings.filter(
      (t: any) => t.required
    ).length;
    const completedTrainings = filteredTrainings.filter(
      (t: any) => t.lastDate !== null
    ).length;
    const expiredTrainings = filteredTrainings.filter(
      (t: any) => t.nextDate && new Date(t.nextDate) < now
    ).length;
    const upcomingTrainings = filteredTrainings.filter((t: any) => {
      if (!t.nextDate) return false;
      const nextDate = new Date(t.nextDate);
      const diffTime = nextDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    }).length;

    return (
      <PageContainer>
        <div className='w-full space-y-4'>
          <div className='flex items-center justify-between'>
            <h1 className='text-3xl font-bold tracking-tight'>Přehled</h1>
          </div>

          <div className='bg-card rounded-lg border p-6'>
            <h2 className='mb-4 text-xl font-semibold'>
              Vítejte v systému AeroLMS
            </h2>
            <p className='text-muted-foreground'>
              Zde najdete přehled všech vašich školení a certifikací. V levém
              menu si můžete vybrat konkrétní školení pro zobrazení detailů.
            </p>
          </div>

          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <div className='bg-card rounded-lg border p-6'>
              <div className='flex flex-col space-y-1.5'>
                <h3 className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
                  <span className='text-blue-500'>🔵</span>
                  Požadovaná školení
                </h3>
                <p className='text-2xl font-bold'>{requiredTrainings}</p>
              </div>
            </div>

            <div className='bg-card rounded-lg border p-6'>
              <div className='flex flex-col space-y-1.5'>
                <h3 className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
                  <span className='text-green-500'>🟢</span>
                  Dokončená školení
                </h3>
                <p className='text-2xl font-bold text-green-600'>
                  {completedTrainings}
                </p>
              </div>
            </div>

            <div className='bg-card rounded-lg border p-6'>
              <div className='flex flex-col space-y-1.5'>
                <h3 className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
                  <span className='text-red-500'>🔴</span>
                  Prošlá školení
                </h3>
                <p
                  className={`text-2xl font-bold ${expiredTrainings > 0 ? 'text-red-600' : ''}`}
                >
                  {expiredTrainings}
                </p>
              </div>
            </div>

            <div className='bg-card rounded-lg border p-6'>
              <div className='flex flex-col space-y-1.5'>
                <h3 className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
                  <span className='text-yellow-500'>🟡</span>
                  Blíží se konec platnosti
                </h3>
                <p
                  className={`text-2xl font-bold ${upcomingTrainings > 0 ? 'text-orange-600' : ''}`}
                >
                  {upcomingTrainings}
                </p>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
            <div className='col-span-4'>
              <BarGraph
                trainings={filteredTrainings.map((t: any) => ({
                  name: t.name,
                  date: t.nextDate
                }))}
              />
            </div>
            <div className='col-span-4 md:col-span-3'>
              <RecentSales
                trainings={filteredTrainings.map((t: any) => ({
                  name: t.name,
                  lastDate: t.lastDate,
                  required: t.required
                }))}
              />
            </div>
          </div>

          {/* Tabulka školení - WORKER vidí pouze požadovaná (Pozadovano=TRUE) */}
          <TrainingsTable trainings={filteredTrainings} />
        </div>
      </PageContainer>
    );
  }

  // Použij code přímo jako slug (case-insensitive)
  const slug = node[0];
  const training = dbTrainings.find(
    (t: any) => t.code.toLowerCase() === slug.toLowerCase()
  );

  // Pokud slug neodpovídá žádnému školení, zobraz 404
  if (!training) {
    return (
      <div className='flex h-[calc(100vh-4rem)] items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-4xl font-bold'>404</h1>
          <p className='text-muted-foreground mt-2'>Stránka nenalezena</p>
        </div>
      </div>
    );
  }

  // Získej data uživatele včetně informací o školení
  // Middleware garantuje, že session existuje a obsahuje buď code nebo email
  // IMPORTANT: Použij raw SQL aby se načetly i dynamické sloupce školení (_*Pozadovano, _*DatumPosl, _*DatumPristi)
  let user: any;

  if (session!.user?.cislo) {
    // Uživatel přihlášen kódem
    const result = await prisma.$queryRaw<any[]>`
      SELECT * FROM InspiritCisZam WHERE Cislo = ${session!.user.cislo}
    `;
    user = result[0];
  } else if (session!.user?.email) {
    // Uživatel přihlášen emailem
    const result = await prisma.$queryRaw<any[]>`
      SELECT * FROM InspiritCisZam WHERE email = ${session!.user.email}
    `;
    user = result[0];
  }

  if (!user) {
    // Uživatel byl pravděpodobně smazán z databáze po přihlášení
    redirect('/login');
  }

  // Dynamicky získej data o školení
  // CRITICAL: Training columns have underscore prefix in database
  const trainingData = {
    datumPosl: user[
      `_${training.code}DatumPosl` as keyof typeof user
    ] as Date | null,
    pozadovano: Boolean(
      user[`_${training.code}Pozadovano` as keyof typeof user]
    ),
    datumPristi: user[
      `_${training.code}DatumPristi` as keyof typeof user
    ] as Date | null
  };

  // Načti detaily školení včetně testů
  // Zaměstnanecký pohled - všechny role vidí pouze aktivní testy
  // Management pohled (všechny testy) je na /trainer/training/[code]/tests
  const testWhereClause = {
    deletedAt: null,
    isActive: true
  };

  const trainingWithTests = await prisma.inspiritTraining.findFirst({
    where: { code: training.code, deletedAt: null },
    include: {
      tests: {
        where: testWhereClause,
        select: {
          id: true
        }
      }
    }
  });

  // BUSINESS RULE: One training = one trainer
  // Načti jediného školitele přiřazeného k tomuto školení
  const trainerAssignment = await prisma.inspiritTrainingAssignment.findFirst({
    where: {
      trainingId: training.id,
      deletedAt: null
    },
    include: {
      trainer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  // Připrav data školitele pro klienta (single trainer or null)
  const trainer = trainerAssignment?.trainer
    ? {
        id: trainerAssignment.trainer.id,
        name: `${trainerAssignment.trainer.firstName || ''} ${trainerAssignment.trainer.lastName || ''}`.trim(),
        email: trainerAssignment.trainer.email
      }
    : null;

  // Připrav data pro klienta
  const trainingForClient = trainingWithTests
    ? {
        id: trainingWithTests.id,
        code: trainingWithTests.code,
        name: trainingWithTests.name,
        description: trainingWithTests.description,
        content: trainingWithTests.content
          ? JSON.parse(trainingWithTests.content)
          : null,
        hasTest: trainingWithTests.tests.length > 0,
        testId: trainingWithTests.tests[0]?.id
      }
    : null;

  return (
    <PageContainer>
      <TrainingClient
        trainingData={trainingData}
        training={trainingForClient}
        displayName={training.name} // Použij name z databáze
        userRole={user.role || 'WORKER'} // Předej roli uživatele
        trainer={trainer} // BUSINESS RULE: One trainer per training (or null)
      />
    </PageContainer>
  );
}

// Generuj metadata pro stránku
export async function generateMetadata({
  params
}: {
  params: Promise<{ node?: string[] }>;
}) {
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
  const training = await prisma.inspiritTraining.findFirst({
    where: {
      code: slug.toUpperCase(), // Převeď na uppercase pro SQL Server
      deletedAt: null
    }
  });

  const displayName = training ? training.name : 'Stránka';

  return {
    title: `${displayName} | AeroLMS`,
    description: `Informace o ${displayName}`
  };
}
