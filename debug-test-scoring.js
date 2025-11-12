const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTestScoring() {
  try {
    // Find test named "test1"
    const test = await prisma.inspiritTest.findFirst({
      where: { title: { contains: 'test1' } },
      include: {
        questions: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!test) {
      console.log('Test "test1" not found');
      await prisma.$disconnect();
      return;
    }

    console.log('='.repeat(70));
    console.log('TEST:', test.title);
    console.log('Test ID:', test.id);
    console.log('Passing Score:', test.passingScore + '%');
    console.log('='.repeat(70));
    console.log('\nQUESTIONS:\n');

    let totalPoints = 0;
    test.questions.forEach((q, index) => {
      console.log(`Question ${index + 1}:`);
      console.log('  ID:', q.id);
      console.log('  Type:', q.type);
      console.log('  Question:', q.question);
      console.log('  Points:', q.points);

      try {
        const options = JSON.parse(q.options || '[]');
        console.log('  Options:', options);
      } catch(e) {
        console.log('  Options parse error:', e.message);
      }

      try {
        const ca = q.correctAnswer || '';
        if (ca.startsWith('[')) {
          const correctAnswers = JSON.parse(ca);
          console.log('  Correct Answers:', correctAnswers);
          console.log('  Number of correct answers:', correctAnswers.length);
        } else {
          console.log('  Correct Answer:', ca);
        }
      } catch(e) {
        console.log('  Correct answer parse error:', e.message);
      }

      totalPoints += q.points;
      console.log('---');
    });

    console.log('\n' + '='.repeat(70));
    console.log('TOTAL POINTS:', totalPoints);
    console.log('='.repeat(70));

    // Check for soft-deleted questions
    const allQuestions = await prisma.inspiritQuestion.findMany({
      where: { testId: test.id }
    });
    const deletedQuestions = allQuestions.filter(q => q.deletedAt !== null);

    console.log('\nSOFT-DELETED QUESTIONS CHECK:');
    console.log('Total questions (including deleted):', allQuestions.length);
    console.log('Active questions:', test.questions.length);
    console.log('Deleted questions:', deletedQuestions.length);

    if (deletedQuestions.length > 0) {
      console.log('\n⚠️  WARNING: Test has soft-deleted questions!');
      deletedQuestions.forEach(q => {
        console.log(`  - Question ID ${q.id}: "${q.question}" (${q.points} points, deleted at ${q.deletedAt})`);
      });
      console.log('\nThis would cause incorrect scoring before the fix!');
    }

    await prisma.$disconnect();
  } catch (err) {
    console.error('Error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

debugTestScoring();
