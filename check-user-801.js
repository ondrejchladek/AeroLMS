const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n=== Kontrola uživatele 801 - Pozadovano sloupce ===\n');

    const result = await prisma.$queryRaw`
      SELECT
        ID,
        Cislo,
        Jmeno,
        Prijmeni,
        _CMMPozadovano,
        _EDMPozadovano,
        _ITBezpecnostPozadovano,
        _CMMDatumPosl,
        _EDMDatumPosl,
        _ITBezpecnostDatumPosl,
        _CMMDatumPristi,
        _EDMDatumPristi,
        _ITBezpecnostDatumPristi
      FROM InspiritCisZam
      WHERE ID = 801
    `;

    if (result.length === 0) {
      console.log('❌ Uživatel s ID 801 nebyl nalezen');
      return;
    }

    const user = result[0];
    console.log(`Uživatel: ${user.Jmeno} ${user.Prijmeni} (Číslo: ${user.Cislo})\n`);

    console.log('📋 Školení CMM:');
    console.log(`  Pozadovano: ${user._CMMPozadovano ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`  DatumPosl: ${user._CMMDatumPosl || 'NULL'}`);
    console.log(`  DatumPristi: ${user._CMMDatumPristi || 'NULL'}\n`);

    console.log('📋 Školení EDM:');
    console.log(`  Pozadovano: ${user._EDMPozadovano ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`  DatumPosl: ${user._EDMDatumPosl || 'NULL'}`);
    console.log(`  DatumPristi: ${user._EDMDatumPristi || 'NULL'}\n`);

    console.log('📋 Školení ITBezpecnost:');
    console.log(`  Pozadovano: ${user._ITBezpecnostPozadovano ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`  DatumPosl: ${user._ITBezpecnostDatumPosl || 'NULL'}`);
    console.log(`  DatumPristi: ${user._ITBezpecnostDatumPristi || 'NULL'}\n`);

    // Spočítej, která školení jsou požadovaná
    const requiredTrainings = [];
    if (user._CMMPozadovano) requiredTrainings.push('CMM');
    if (user._EDMPozadovano) requiredTrainings.push('EDM');
    if (user._ITBezpecnostPozadovano) requiredTrainings.push('ITBezpecnost');

    console.log(`\n📊 Souhrn:`);
    console.log(`  Počet požadovaných školení: ${requiredTrainings.length}`);
    if (requiredTrainings.length > 0) {
      console.log(`  Seznam: ${requiredTrainings.join(', ')}`);
    } else {
      console.log(`  ⚠️ Uživateli nejsou požadována žádná školení!`);
    }

  } catch (error) {
    console.error('❌ Chyba:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
