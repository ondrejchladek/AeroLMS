const { PrismaClient } = require('./generated/client-sqlite');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SQLite database seeding...');

  // Create demo users
  const users = [
    { code: 1001, name: 'Jan Novák' },
    { code: 1002, name: 'Petr Svoboda' },
    { code: 1003, name: 'Marie Dvořáková' },
    { code: 1004, name: 'Eva Procházková' },
    { code: 1005, name: 'Tomáš Krejčí' }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { code: user.code },
      update: {},
      create: {
        code: user.code,
        name: user.name,
        email: `user${user.code}@aerolms.cz`,
        password: 'password123', // In production, this should be hashed
        MonitorVyraCMTDiluPozadovano: true,
        MonitorVyraCMTDiluDatumPristi: new Date('2025-02-15'),
        ITBezpecnostPozadovano: true,
        ITBezpecnostDatumPristi: new Date('2025-03-01'),
        KnihaStrojePozadovano: true,
        KnihaStrojeDatumPristi: new Date('2025-01-30')
      }
    });
  }

  console.log('✅ Users created');

  // Create demo trainings
  const trainingsData = [
    {
      code: 'MONITOR-CMT',
      name: 'Monitorování výroby CMT dílů',
      description: 'Školení o postupech monitorování výroby CMT dílů včetně CMT pravidel.',
      content: JSON.stringify({
        introduction: 'Toto školení pokrývá základní postupy monitorování výroby CMT dílů...',
        keyPoints: [
          'Kontrola kvality CMT dílů',
          'Správné postupy měření',
          'Dokumentace výsledků'
        ],
        rules: [
          'Vždy používejte kalibrované měřidla',
          'Kontrolujte každý 10. díl',
          'Zaznamenávejte všechny odchylky'
        ]
      })
    },
    {
      code: 'IT-BEZPECNOST',
      name: 'IT Bezpečnost',
      description: 'Základy bezpečnosti informačních technologií a ochrana firemních dat.',
      content: JSON.stringify({
        introduction: 'Bezpečnost IT systémů je klíčová pro ochranu firemních dat...',
        keyPoints: [
          'Silná hesla a jejich správa',
          'Rozpoznání phishingových útoků',
          'Bezpečné používání firemních zařízení'
        ],
        rules: [
          'Nikdy nesdílejte přihlašovací údaje',
          'Zamykejte počítač při odchodu',
          'Hlaste podezřelé aktivity IT oddělení'
        ]
      })
    },
    {
      code: 'KNIHA-STROJE',
      name: 'Kniha stroje',
      description: 'Správné vedení knihy stroje a dokumentace údržby.',
      content: JSON.stringify({
        introduction: 'Kniha stroje je důležitým dokumentem pro sledování údržby...',
        keyPoints: [
          'Denní kontroly před spuštěním',
          'Záznam všech oprav a údržby',
          'Pravidelné revize a kontroly'
        ],
        rules: [
          'Zapisujte ihned po provedení',
          'Používejte čitelné písmo',
          'Uvádějte přesné časy a data'
        ]
      })
    }
  ];

  for (const training of trainingsData) {
    const createdTraining = await prisma.training.upsert({
      where: { code: training.code },
      update: {},
      create: training
    });

    // Create a test for each training
    await prisma.test.create({
      data: {
        trainingId: createdTraining.id,
        title: `Test - ${training.name}`,
        description: `Ověřovací test ke školení ${training.name}`,
        passingScore: 80,
        timeLimit: 30,
        questions: {
          create: [
            {
              order: 1,
              type: 'single-choice',
              question: 'Jaká je hlavní zásada tohoto školení?',
              options: JSON.stringify([
                'Rychlost práce',
                'Kvalita a bezpečnost',
                'Minimální náklady',
                'Maximální výkon'
              ]),
              correctAnswer: 'Kvalita a bezpečnost',
              points: 10,
              required: true
            },
            {
              order: 2,
              type: 'true-false',
              question: 'Je důležité dodržovat všechny uvedené postupy?',
              options: JSON.stringify(['Ano', 'Ne']),
              correctAnswer: 'Ano',
              points: 10,
              required: true
            },
            {
              order: 3,
              type: 'multiple-choice',
              question: 'Které z následujících patří mezi hlavní body školení? (vyberte všechny správné)',
              options: JSON.stringify([
                'Dodržování postupů',
                'Ignorování pravidel',
                'Dokumentace',
                'Improvizace'
              ]),
              correctAnswer: JSON.stringify(['Dodržování postupů', 'Dokumentace']),
              points: 10,
              required: true
            }
          ]
        }
      }
    });
  }

  console.log('✅ Trainings and tests created');

  // Create some test attempts for demonstration
  const user = await prisma.user.findFirst({ where: { code: 1001 } });
  const training = await prisma.training.findFirst({ where: { code: 'MONITOR-CMT' } });
  const test = await prisma.test.findFirst({ where: { trainingId: training.id } });

  if (user && test) {
    await prisma.testAttempt.create({
      data: {
        testId: test.id,
        userId: user.id,
        completedAt: new Date(),
        score: 90,
        passed: true,
        answers: JSON.stringify({
          1: 'Kvalita a bezpečnost',
          2: 'Ano',
          3: ['Dodržování postupů', 'Dokumentace']
        }),
        employeeCode: user.code,
        employeeName: user.name,
        department: 'Výroba',
        workPosition: 'Operátor CNC',
        supervisor: 'Ing. Pavel Černý',
        evaluator: 'Bc. Jana Bílá'
      }
    });
  }

  console.log('✅ Sample test attempt created');
  console.log('🎉 SQLite database seeding completed!');
}

main()
  .catch(e => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });