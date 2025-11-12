const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const tests = await prisma.inspiritTest.findMany({
      where: {
        trainingId: 1,
        deletedAt: null
      },
      include: {
        questions: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { id: 'asc' }
    });

    console.log('\n=== CMM Školení - Testy ===\n');

    tests.forEach(test => {
      console.log(`Test ID: ${test.id}`);
      console.log(`  Název: ${test.title}`);
      console.log(`  Aktivní: ${test.isActive ? '✅ ANO' : '❌ NE'}`);
      console.log(`  Otázek: ${test.questions.length}`);

      if (test.questions.length > 0) {
        console.log('\n  Otázky:');
        test.questions.forEach(q => {
          const options = q.options ? JSON.parse(q.options) : [];
          console.log(`    Q${q.order}: ${q.question}`);
          console.log(`      Typ: ${q.type}`);
          console.log(`      Možnosti: ${options.length > 0 ? options.join(', ') : '(žádné)'}`);
          console.log(`      Správná odpověď: ${q.correctAnswer}`);
        });
      }
      console.log('');
    });

    // Simulace API volání pro WORKER
    console.log('\n=== Co WORKER uvidí z API ===\n');
    const workerTests = tests.filter(t => t.isActive);
    console.log(`Počet aktivních testů: ${workerTests.length}`);

    if (workerTests.length > 0) {
      const firstTest = workerTests[0];
      console.log(`\nPrvní test v poli (tests[0]):`);
      console.log(`  ID: ${firstTest.id}`);
      console.log(`  Název: ${firstTest.title}`);
      console.log(`  Počet otázek: ${firstTest.questions.length}`);
    }

  } catch (error) {
    console.error('Chyba:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
