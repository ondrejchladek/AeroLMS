const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT
      ID,
      Cislo,
      Jmeno,
      Prijmeni,
      _CMMPozadovano,
      _EDMPozadovano,
      _ITBezpecnostPozadovano
    FROM InspiritCisZam
    WHERE Cislo = '123456'
  `;

  if (result.length === 0) {
    console.log('❌ Uživatel s číslem 123456 nebyl nalezen');
    return;
  }

  const u = result[0];
  console.log('\n=== Uživatel s číslem 123456 ===');
  console.log('ID:', u.ID);
  console.log('Jméno:', u.Jmeno, u.Prijmeni);
  console.log('\n📋 Aktuální Pozadovano hodnoty:');
  console.log('  CMM:', u._CMMPozadovano ? '✅ 1 (požadováno)' : '❌ 0 (NEPOŽADOVÁNO)');
  console.log('  EDM:', u._EDMPozadovano ? '✅ 1 (požadováno)' : '❌ 0 (NEPOŽADOVÁNO)');
  console.log('  ITBezpecnost:', u._ITBezpecnostPozadovano ? '✅ 1 (požadováno)' : '❌ 0 (NEPOŽADOVÁNO)');

  await prisma.$disconnect();
}

main();
