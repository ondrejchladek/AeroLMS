const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Nastav uživateli 801: CMM=1, EDM=0, ITBezpecnost=1
  await prisma.$executeRaw`
    UPDATE TabCisZam_EXT
    SET
      _CMMPozadovano = 1,
      _EDMPozadovano = 0,
      _ITBezpecnostPozadovano = 1
    WHERE ID = 801
  `;

  console.log('\n✅ Uživatel 801 aktualizován:');
  console.log('  CMM: 1 (požadováno)');
  console.log('  EDM: 0 (NEPOŽADOVÁNO) ❌');
  console.log('  ITBezpecnost: 1 (požadováno)');
  console.log('\n📊 Očekávaný výsledek:');
  console.log('  Měl by vidět pouze 2 školení: CMM a ITBezpecnost');
  console.log('  EDM by se NEMĚLO zobrazit v sidebaru ani tabulce\n');

  // Ověř změny
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
    WHERE ID = 801
  `;

  console.log('🔍 Kontrola v databázi:');
  const user = result[0];
  console.log(`  _CMMPozadovano: ${user._CMMPozadovano}`);
  console.log(`  _EDMPozadovano: ${user._EDMPozadovano}`);
  console.log(`  _ITBezpecnostPozadovano: ${user._ITBezpecnostPozadovano}\n`);

  await prisma.$disconnect();
}

main();
