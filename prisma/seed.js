// prisma/seed.js  –  CommonJS, funguje 100 %
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  // 1. Zachováváme původního uživatele s kódem - všechna školení požadovaná
  const userData1 = {
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
  };
  
  await prisma.user.upsert({
    where: { code: 123456 },
    update: userData1,
    create: userData1
  });

  // 2. Přidáváme uživatele s emailem a heslem - všechna školení požadovaná
  const hashedPassword = await bcrypt.hash('test', 10);
  const userData2 = {
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
  };
  
  await prisma.user.upsert({
    where: { email: 'test@test.cz' },
    update: userData2,
    create: userData2
  });

  console.log('✅ Testovací uživatelé:');
  console.log('   - Kód: 123456');
  console.log('   - Email: test@test.cz, Heslo: test');
  
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
