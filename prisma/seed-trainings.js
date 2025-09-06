// prisma/seed-trainings.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Definice všech školení
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

async function seedTrainings() {
  console.log('🌱 Začínám seed školení...');
  
  for (const training of trainingDefinitions) {
    try {
      // Použij upsert pro případ, že školení už existuje
      await prisma.training.upsert({
        where: { code: training.code },
        update: {
          name: training.name,
          description: training.description
        },
        create: {
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
      
      console.log(`✅ Školení ${training.name} (${training.code}) vytvořeno/aktualizováno`);
    } catch (error) {
      console.error(`❌ Chyba při vytváření školení ${training.name}:`, error);
    }
  }
  
  console.log('✅ Seed školení dokončen!');
  
  // Zobraz počet školení v databázi
  const count = await prisma.training.count();
  console.log(`📊 Celkem školení v databázi: ${count}`);
}

seedTrainings()
  .catch((e) => {
    console.error('Chyba při seedování:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });