const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n=== Kontrola uživatele 801 - RAW hodnoty z databáze ===\n');

    const result = await prisma.$queryRawUnsafe(`
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
    `);

    if (result.length === 0) {
      console.log('❌ Uživatel s ID 801 nebyl nalezen');
      return;
    }

    const user = result[0];
    console.log(`Uživatel: ${user.Jmeno} ${user.Prijmeni} (Číslo: ${user.Cislo})\n`);

    console.log('📋 RAW hodnoty Pozadovano sloupců (jak jsou v DB):');
    console.log(`  _CMMPozadovano: ${user._CMMPozadovano} (type: ${typeof user._CMMPozadovano})`);
    console.log(`  _EDMPozadovano: ${user._EDMPozadovano} (type: ${typeof user._EDMPozadovano})`);
    console.log(`  _ITBezpecnostPozadovano: ${user._ITBezpecnostPozadovano} (type: ${typeof user._ITBezpecnostPozadovano})`);

    console.log('\n📊 Interpretace (SQL Server BIT → JavaScript boolean):');
    console.log(`  CMM: ${user._CMMPozadovano} → ${user._CMMPozadovano ? 'TRUE (1)' : 'FALSE (0)'}`);
    console.log(`  EDM: ${user._EDMPozadovano} → ${user._EDMPozadovano ? 'TRUE (1)' : 'FALSE (0)'}`);
    console.log(`  ITBezpecnost: ${user._ITBezpecnostPozadovano} → ${user._ITBezpecnostPozadovano ? 'TRUE (1)' : 'FALSE (0)'}`);

    // Zkontroluj datatype v databázi
    console.log('\n🔍 Kontrola datových typů v databázi:');
    const columnInfo = await prisma.$queryRawUnsafe(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TabCisZam_EXT'
        AND COLUMN_NAME LIKE '%Pozadovano'
      ORDER BY COLUMN_NAME
    `);

    columnInfo.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

  } catch (error) {
    console.error('❌ Chyba:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
