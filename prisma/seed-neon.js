// prisma/seed-neon.js - Seed script pro Neon databázi
const { PrismaClient } = require('../prisma/generated/client-neon');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Neon database...');

  // Vymaž existující data
  await prisma.testAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.test.deleteMany();
  await prisma.training.deleteMany();
  await prisma.user.deleteMany();

  // 1. Vytvoř uživatele - přesně jako v SQL Server
  const hashedPassword = await bcrypt.hash('test', 10);

  // První uživatel - s kódem, všechna školení požadovaná
  const user1 = await prisma.user.create({
    data: {
      code: 123456,
      name: 'První Testovací',
      // Všechna školení nastavena jako požadovaná
      CMMPozadovano: true,
      EDMPozadovano: true,
      VizualniKontrolaPozadovano: true,
      ZnaceniPozadovano: true,
      ZlomeniNastrojePozadovano: true,
      VzorovaniPozadovano: true,
      UdrzbaStrojuPracovnikyDilnyPozadovano: true,
      SystemmanagemenntuKvalityCilepodnikuPozadovano: true,
      SymbolyvBBPozadovano: true,
      SeriovaCislaPozadovano: true,
      SamokontrolaPozadovano: true,
      RegulacniKartyPozadovano: true,
      PruvodkaPozadovano: true,
      PraceKonProduktPozadovano: true,
      PouzitiNatsrojuPozadovano: true,
      OpotrebeniNastrojuuCMTPozadovano: true,
      MonitorVyraCMTDiluPozadovano: true,
      MeridlaPozadovano: true,
      KnihaStrojePozadovano: true,
      MerAVyhodOpotrebeniPozadovano: true,
      PozdavkyEN10204DodakPozadovano: true,
      VrtaniKritDilyPozadovano: true,
      ZkouskaTvrdostiPozadovano: true,
      EleZnaceniPozadovano: true,
      TrideniOdpaduPozadovano: true,
      NakladaniLatkamiPozadovano: true,
      ITBezpecnostPozadovano: true,
      RazK1KPozadovano: true,
      KontrPrijZbozPozadovano: true,
    }
  });

  // Druhý uživatel - s emailem a heslem, všechna školení požadovaná
  const user2 = await prisma.user.create({
    data: {
      email: 'test@test.cz',
      password: hashedPassword,
      name: 'Test User',
      // Všechna školení nastavena jako požadovaná
      CMMPozadovano: true,
      EDMPozadovano: true,
      VizualniKontrolaPozadovano: true,
      ZnaceniPozadovano: true,
      ZlomeniNastrojePozadovano: true,
      VzorovaniPozadovano: true,
      UdrzbaStrojuPracovnikyDilnyPozadovano: true,
      SystemmanagemenntuKvalityCilepodnikuPozadovano: true,
      SymbolyvBBPozadovano: true,
      SeriovaCislaPozadovano: true,
      SamokontrolaPozadovano: true,
      RegulacniKartyPozadovano: true,
      PruvodkaPozadovano: true,
      PraceKonProduktPozadovano: true,
      PouzitiNatsrojuPozadovano: true,
      OpotrebeniNastrojuuCMTPozadovano: true,
      MonitorVyraCMTDiluPozadovano: true,
      MeridlaPozadovano: true,
      KnihaStrojePozadovano: true,
      MerAVyhodOpotrebeniPozadovano: true,
      PozdavkyEN10204DodakPozadovano: true,
      VrtaniKritDilyPozadovano: true,
      ZkouskaTvrdostiPozadovano: true,
      EleZnaceniPozadovano: true,
      TrideniOdpaduPozadovano: true,
      NakladaniLatkamiPozadovano: true,
      ITBezpecnostPozadovano: true,
      RazK1KPozadovano: true,
      KontrPrijZbozPozadovano: true,
    }
  });

  console.log('✅ Testovací uživatelé vytvořeni:');
  console.log('   - Kód: 123456');
  console.log('   - Email: test@test.cz, Heslo: test');

  // 2. Vytvoř školení - přesně jako v SQL Server databázi
  const trainingDefinitions = [
    { code: 'CMM', name: 'CMM', description: 'Školení CMM' },
    { code: 'EDM', name: 'EDM', description: 'Školení EDM' },
    { code: 'VizualniKontrola', name: 'Vizuální kontrola', description: 'Školení vizuální kontroly' },
    { code: 'Znaceni', name: 'Značení', description: 'Školení značení' },
    { code: 'ZlomeniNastroje', name: 'Zlomení nástroje', description: 'Školení zlomení nástroje' },
    { code: 'Vzorovani', name: 'Vzorování', description: 'Školení vzorování' },
    { code: 'UdrzbaStrojuPracovnikyDilny', name: 'Údržba strojů pracovníky dílny', description: 'Školení údržby strojů' },
    { code: 'SystemmanagemenntuKvalityCilepodniku', name: 'Systém managementu kvality', description: 'Školení systému managementu kvality' },
    { code: 'SymbolyvBB', name: 'Symboly v BB', description: 'Školení symbolů v BB' },
    { code: 'SeriovaCisla', name: 'Sériová čísla', description: 'Školení sériových čísel' },
    { code: 'Samokontrola', name: 'Samokontrola', description: 'Školení samokontroly' },
    { code: 'RegulacniKarty', name: 'Regulační karty', description: 'Školení regulačních karet' },
    { code: 'Pruvodka', name: 'Průvodka', description: 'Školení průvodky' },
    { code: 'PraceKonProdukt', name: 'Práce kon. produkt', description: 'Školení práce s konečným produktem' },
    { code: 'PouzitiNatsroju', name: 'Použití nástrojů', description: 'Školení použití nástrojů' },
    { code: 'OpotrebeniNastrojuuCMT', name: 'Opotřebení nástrojů u CMT', description: 'Školení opotřebení nástrojů' },
    { code: 'MonitorVyraCMTDilu', name: 'Monitor výroba CMT dílů', description: 'Školení monitoru výroby CMT dílů' },
    { code: 'Meridla', name: 'Měřidla', description: 'Školení měřidel' },
    { code: 'KnihaStroje', name: 'Kniha stroje', description: 'Školení knihy stroje' },
    { code: 'MerAVyhodOpotrebeni', name: 'Měření a vyhodnocení opotřebení', description: 'Školení měření a vyhodnocení opotřebení' },
    { code: 'PozdavkyEN10204Dodak', name: 'Požadavky EN10204', description: 'Školení požadavků EN10204' },
    { code: 'VrtaniKritDily', name: 'Vrtání krit. díly', description: 'Školení vrtání kritických dílů' },
    { code: 'ZkouskaTvrdosti', name: 'Zkouška tvrdosti', description: 'Školení zkoušky tvrdosti' },
    { code: 'EleZnaceni', name: 'Elektronické značení', description: 'Školení elektronického značení' },
    { code: 'TrideniOdpadu', name: 'Třídění odpadu', description: 'Školení třídění odpadu' },
    { code: 'NakladaniLatkami', name: 'Nakládání s látkami', description: 'Školení nakládání s nebezpečnými látkami' },
    { code: 'ITBezpecnost', name: 'IT Bezpečnost', description: 'Školení IT bezpečnosti' },
    { code: 'RazK1K', name: 'Raz K1K', description: 'Školení Raz K1K' },
    { code: 'KontrPrijZboz', name: 'Kontrola přijatého zboží', description: 'Školení kontroly přijatého zboží' }
  ];

  for (const training of trainingDefinitions) {
    await prisma.training.create({
      data: {
        code: training.code,
        name: training.name,
        description: training.description,
        content: JSON.stringify({
          sections: [
            {
              type: 'introduction',
              title: 'Úvod',
              content: `Úvodní informace ke školení ${training.name}.`
            },
            {
              type: 'keyPoints',
              title: 'Klíčové body',
              points: [
                'Důležitý bod 1',
                'Důležitý bod 2',
                'Důležitý bod 3'
              ]
            }
          ]
        })
      }
    });
  }

  console.log(`✅ Vytvořeno ${trainingDefinitions.length} školení`);

  // 3. Vytvoř ukázkový test pro Monitor výroba CMT dílů
  const monitorTraining = await prisma.training.findUnique({
    where: { code: 'MonitorVyraCMTDilu' }
  });

  if (monitorTraining) {
    const test = await prisma.test.create({
      data: {
        title: 'Test - Monitor výroba CMT dílů',
        description: 'Test znalostí pro Monitor výroba CMT dílů',
        trainingId: monitorTraining.id,
        passingScore: 80,
        timeLimit: 30,
        questions: {
          create: [
            {
              question: 'Jaká je správná tolerance pro CMT díly?',
              type: 'single',
              options: JSON.stringify(['±0.1mm', '±0.2mm', '±0.5mm', '±1mm']),
              correctAnswer: JSON.stringify('±0.1mm'),
              points: 10,
              order: 1,
              required: true
            },
            {
              question: 'Které kontrolní body jsou povinné při výrobě CMT dílů?',
              type: 'multiple',
              options: JSON.stringify(['Vstupní kontrola', 'Mezioperační kontrola', 'Výstupní kontrola', 'Náhodná kontrola']),
              correctAnswer: JSON.stringify(['Vstupní kontrola', 'Mezioperační kontrola', 'Výstupní kontrola']),
              points: 10,
              order: 2,
              required: true
            },
            {
              question: 'CMT díly musí být kontrolovány každé 2 hodiny během výroby.',
              type: 'truefalse',
              options: JSON.stringify(['Pravda', 'Nepravda']),
              correctAnswer: JSON.stringify('Pravda'),
              points: 5,
              order: 3,
              required: true
            }
          ]
        }
      }
    });
    console.log('✅ Vytvořen test pro Monitor výroba CMT dílů');
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });