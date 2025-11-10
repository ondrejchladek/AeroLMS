const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.$queryRaw`
    SELECT
      ID,
      Cislo,
      Jmeno,
      Prijmeni,
      role,
      _CMMPozadovano,
      _EDMPozadovano,
      _ITBezpecnostPozadovano
    FROM InspiritCisZam
    WHERE Cislo = '123456'
  `;

  if (user.length > 0) {
    const u = user[0];
    console.log('\n=== Uživatel 123456 ===');
    console.log('Jméno:', u.Jmeno, u.Prijmeni);
    console.log('Role:', u.role || 'WORKER');
    console.log('\nPožadovaná školení:');
    console.log('  CMM:', u._CMMPozadovano ? '✅ ANO (1)' : '❌ NE (0)');
    console.log('  EDM:', u._EDMPozadovano ? '✅ ANO (1)' : '❌ NE (0)');
    console.log('  ITBezpecnost:', u._ITBezpecnostPozadovano ? '✅ ANO (1)' : '❌ NE (0)');

    const required = [];
    if (u._CMMPozadovano) required.push('CMM');
    if (u._EDMPozadovano) required.push('EDM');
    if (u._ITBezpecnostPozadovano) required.push('ITBezpecnost');

    console.log('\n📊 Měl by vidět', required.length, 'školení:', required.join(', ') || 'ŽÁDNÉ');
  } else {
    console.log('❌ Uživatel 123456 nebyl nalezen');
  }

  await prisma.$disconnect();
}

main();
