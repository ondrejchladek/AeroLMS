const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`
    UPDATE TabCisZam_EXT
    SET
      _CMMPozadovano = 1,
      _EDMPozadovano = 0,
      _ITBezpecnostPozadovano = 1
    WHERE ID = 3
  `;

  console.log('\n✅ Uživatel 123456 (ID=3) aktualizován:');
  console.log('  CMM: 1 (požadováno)');
  console.log('  EDM: 0 (NEPOŽADOVÁNO) ❌');
  console.log('  ITBezpecnost: 1 (požadováno)');

  const result = await prisma.$queryRaw`
    SELECT ID, Cislo, Jmeno, Prijmeni,
      _CMMPozadovano, _EDMPozadovano, _ITBezpecnostPozadovano
    FROM InspiritCisZam WHERE ID = 3
  `;

  console.log('\n🔍 Kontrola v databázi:');
  const user = result[0];
  console.log(`  _CMMPozadovano: ${user._CMMPozadovano ? '1 ✅' : '0 ❌'}`);
  console.log(`  _EDMPozadovano: ${user._EDMPozadovano ? '1 ✅' : '0 ❌'}`);
  console.log(`  _ITBezpecnostPozadovano: ${user._ITBezpecnostPozadovano ? '1 ✅' : '0 ❌'}\n`);

  await prisma.$disconnect();
}

main();
