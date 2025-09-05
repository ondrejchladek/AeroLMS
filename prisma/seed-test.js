const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTestData() {
  try {
    // 1. Vytvoř školení pro Monitor výroba CMT dílů
    const training = await prisma.training.upsert({
      where: { code: 'MonitorVyraCMTDilu' },
      update: {},
      create: {
        code: 'MonitorVyraCMTDilu',
        name: 'Monitor výroba CMT dílů',
        description: 'Školení zaměřené na monitorování výroby CMT dílů a CMT pravidla',
        content: JSON.stringify({
          sections: [
            {
              title: 'Úvod do CMT technologie',
              content: {
                introduction: 'CMT (Cold Metal Transfer) je pokročilá svařovací technologie...',
                keyPoints: [
                  'Nízký tepelný příkon',
                  'Minimální rozstřik',
                  'Vysoká kvalita svaru',
                  'Vhodné pro tenké materiály'
                ],
                image: '/images/cmt-process.png'
              }
            },
            {
              title: 'Pravidla výroby CMT dílů',
              content: {
                rules: [
                  {
                    number: 1,
                    title: 'Příprava pracoviště',
                    description: 'Pracoviště musí být čisté a organizované',
                    checklist: [
                      'Zkontrolovat čistotu svařovacího hořáku',
                      'Ověřit nastavení ochranného plynu',
                      'Připravit měřicí přístroje'
                    ]
                  },
                  {
                    number: 2,
                    title: 'Kontrola parametrů',
                    description: 'Před zahájením výroby zkontrolovat všechny parametry',
                    parameters: {
                      'Průtok plynu': '12-15 l/min',
                      'Rychlost drátu': '3-8 m/min',
                      'Napětí': '12-18 V'
                    }
                  }
                ]
              }
            },
            {
              title: 'Kvalitativní požadavky',
              content: {
                standards: [
                  'ISO 9001:2015',
                  'EN ISO 3834-2',
                  'Interní směrnice ATC-037'
                ],
                tolerances: {
                  'Délka svaru': '±0.5 mm',
                  'Výška převýšení': 'max 2 mm',
                  'Šířka svaru': '5-8 mm'
                },
                defects: [
                  'Pórovitost',
                  'Studené spoje',
                  'Vady tvaru svaru'
                ]
              }
            },
            {
              title: 'Dokumentace a záznamy',
              content: {
                documents: [
                  {
                    name: 'Průvodka',
                    purpose: 'Identifikace dílu a sledování výroby',
                    fields: ['Číslo zakázky', 'Datum výroby', 'Operátor', 'Kontrola']
                  },
                  {
                    name: 'Kniha stroje',
                    purpose: 'Evidence provozu a údržby stroje',
                    frequency: 'Denně'
                  },
                  {
                    name: 'Protokol o kontrole',
                    purpose: 'Záznam výsledků kontroly kvality',
                    frequency: 'Každá série'
                  }
                ]
              }
            },
            {
              title: 'Bezpečnost práce',
              content: {
                ppe: [
                  'Svářečská kukla s automatickým stmíváním',
                  'Kožené rukavice',
                  'Nehořlavý pracovní oděv',
                  'Bezpečnostní obuv S3'
                ],
                hazards: [
                  'UV záření',
                  'Horké povrchy',
                  'Svařovací dýmy',
                  'Elektrický proud'
                ],
                emergency: {
                  'První pomoc': 'Linka 155',
                  'Hasiči': 'Linka 150',
                  'Interní tísňová linka': '2222'
                }
              }
            }
          ]
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('Created training:', training.name);

    // 2. Vytvoř test pro toto školení
    const test = await prisma.test.upsert({
      where: { id: 1 }, // Použij ID protože nemáme unique constraint na title
      update: {},
      create: {
        trainingId: training.id,
        title: 'ATC 037.10 Ověření účinnosti školení - Monitorování výroby CMT dílů',
        description: 'Test ověřující znalosti z oblasti monitorování výroby CMT dílů a CMT pravidel',
        passingScore: 80,
        timeLimit: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('Created test:', test.title);

    // 3. Vytvoř otázky pro test
    const questions = [
      {
        order: 1,
        type: 'single',
        question: 'Co znamená zkratka CMT?',
        options: JSON.stringify([
          'Cold Metal Transfer',
          'Computer Manufacturing Technology',
          'Centralized Machine Tool',
          'Controlled Material Testing'
        ]),
        correctAnswer: JSON.stringify('Cold Metal Transfer'),
        points: 1,
        required: true
      },
      {
        order: 2,
        type: 'multiple',
        question: 'Jaké jsou hlavní výhody CMT technologie? (vyberte všechny správné odpovědi)',
        options: JSON.stringify([
          'Nízký tepelný příkon',
          'Minimální rozstřik',
          'Vysoká rychlost svařování',
          'Vhodné pro tenké materiály',
          'Nepotřebuje ochranný plyn'
        ]),
        correctAnswer: JSON.stringify(['Nízký tepelný příkon', 'Minimální rozstřik', 'Vhodné pro tenké materiály']),
        points: 3,
        required: true
      },
      {
        order: 3,
        type: 'single',
        question: 'Jaký je doporučený průtok ochranného plynu pro CMT svařování?',
        options: JSON.stringify([
          '5-8 l/min',
          '8-10 l/min',
          '12-15 l/min',
          '18-22 l/min'
        ]),
        correctAnswer: JSON.stringify('12-15 l/min'),
        points: 1,
        required: true
      },
      {
        order: 4,
        type: 'yesno',
        question: 'Je nutné provádět denní kontrolu čistoty svařovacího hořáku?',
        options: JSON.stringify(['Ano', 'Ne']),
        correctAnswer: JSON.stringify('Ano'),
        points: 1,
        required: true
      },
      {
        order: 5,
        type: 'single',
        question: 'Jaká je maximální povolená výška převýšení svaru?',
        options: JSON.stringify([
          '1 mm',
          '2 mm',
          '3 mm',
          '4 mm'
        ]),
        correctAnswer: JSON.stringify('2 mm'),
        points: 1,
        required: true
      },
      {
        order: 6,
        type: 'multiple',
        question: 'Které dokumenty je nutné vyplňovat při výrobě CMT dílů?',
        options: JSON.stringify([
          'Průvodka',
          'Kniha stroje',
          'Protokol o kontrole',
          'Osobní deník',
          'Výkaz práce'
        ]),
        correctAnswer: JSON.stringify(['Průvodka', 'Kniha stroje', 'Protokol o kontrole']),
        points: 3,
        required: true
      },
      {
        order: 7,
        type: 'text',
        question: 'Popište postup při zjištění vadného CMT dílu (min. 2 věty)',
        options: null,
        correctAnswer: JSON.stringify('keywords:zastavit,označit,zapsat,informovat,nadřízený,kvalita'),
        points: 2,
        required: true
      },
      {
        order: 8,
        type: 'single',
        question: 'Jaká je tolerance délky svaru dle interních směrnic?',
        options: JSON.stringify([
          '±0.2 mm',
          '±0.5 mm',
          '±1.0 mm',
          '±2.0 mm'
        ]),
        correctAnswer: JSON.stringify('±0.5 mm'),
        points: 1,
        required: true
      },
      {
        order: 9,
        type: 'multiple',
        question: 'Které osobní ochranné pomůcky jsou povinné při CMT svařování?',
        options: JSON.stringify([
          'Svářečská kukla',
          'Kožené rukavice',
          'Respirátor',
          'Nehořlavý oděv',
          'Bezpečnostní obuv S3',
          'Reflexní vesta'
        ]),
        correctAnswer: JSON.stringify(['Svářečská kukla', 'Kožené rukavice', 'Nehořlavý oděv', 'Bezpečnostní obuv S3']),
        points: 4,
        required: true
      },
      {
        order: 10,
        type: 'yesno',
        question: 'Může operátor CMT stroje provádět základní údržbu stroje samostatně?',
        options: JSON.stringify(['Ano', 'Ne']),
        correctAnswer: JSON.stringify('Ano'),
        points: 1,
        required: true
      },
      {
        order: 11,
        type: 'single',
        question: 'Jak často se provádí kontrola parametrů svařování během směny?',
        options: JSON.stringify([
          'Jednou za směnu',
          'Každé 2 hodiny',
          'Při každé změně série',
          'Pouze při zahájení směny'
        ]),
        correctAnswer: JSON.stringify('Při každé změně série'),
        points: 1,
        required: true
      },
      {
        order: 12,
        type: 'single',
        question: 'Jaké je interní číslo tísňové linky?',
        options: JSON.stringify([
          '1111',
          '2222',
          '3333',
          '4444'
        ]),
        correctAnswer: JSON.stringify('2222'),
        points: 1,
        required: true
      }
    ];

    // Vytvoř všechny otázky
    for (const questionData of questions) {
      const question = await prisma.question.create({
        data: {
          testId: test.id,
          ...questionData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`Created question ${question.order}: ${question.question.substring(0, 50)}...`);
    }

    console.log('Test data seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Spusť seed funkci
seedTestData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });