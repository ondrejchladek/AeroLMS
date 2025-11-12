// List all trainings with their IDs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTrainings() {
  try {
    console.log('\n=== Všechna školení v databázi ===\n');

    const trainings = await prisma.inspiritTraining.findMany({
      include: {
        tests: {
          where: {
            deletedAt: null
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    });

    if (trainings.length === 0) {
      console.log('Žádná školení nenalezena.');
      return;
    }

    console.log(`Nalezeno ${trainings.length} školení:\n`);

    trainings.forEach((training) => {
      const activeTests = training.tests.filter(t => t.isActive);
      console.log(`ID: ${training.id}`);
      console.log(`  Kód: ${training.code}`);
      console.log(`  Název: ${training.name || '(bez názvu)'}`);
      console.log(`  Testů: ${training.tests.length} (aktivních: ${activeTests.length})`);
      console.log('');
    });

    console.log('\n📝 Pro debug konkrétního školení použij:');
    console.log('   node debug-test-questions.js <ID>\n');

  } catch (error) {
    console.error('Chyba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listTrainings();
