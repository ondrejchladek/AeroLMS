const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT Cislo, Alias, Jmeno, Prijmeni
      FROM InspiritCisZam WHERE ID = 801
    `;

    if (result.length === 0) {
      console.log('❌ Uživatel s ID 801 nebyl nalezen');
      return;
    }

    const user = result[0];
    console.log('\n🔑 Přihlašovací údaje uživatele 801:');
    console.log(`  Jméno: ${user.Jmeno} ${user.Prijmeni}`);
    console.log(`  Login (číslo): ${user.Cislo}`);
    console.log(`  Heslo: ${user.Alias || 'NENÍ NASTAVENO'}`);
    console.log('\n📝 Očekávané chování po přihlášení:');
    console.log('  ✅ Sidebar: CMM, ITBezpecnost (2 odkazy)');
    console.log('  ✅ Dashboard: CMM, ITBezpecnost (2 řádky v tabulce)');
    console.log('  ✅ Statistika "Požadovaná školení": 2');
    console.log('  ❌ EDM: Nemělo by se zobrazit NIKDE!\n');
  } catch (error) {
    console.error('❌ Chyba:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
