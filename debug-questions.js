const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugQuestions() {
  try {
    const questions = await prisma.inspiritQuestion.findMany({
      where: { type: 'multiple' },
      include: { test: { select: { title: true } } },
      take: 5
    });

    questions.forEach(q => {
      console.log('='.repeat(70));
      console.log('Test:', q.test.title);
      console.log('Question:', q.question);
      console.log('Type:', q.type);
      console.log('---');
      console.log('Options (raw):', q.options);
      console.log('CorrectAnswer (raw):', q.correctAnswer);
      console.log('---');

      try {
        const parsedOptions = JSON.parse(q.options || '[]');
        console.log('Options (parsed):', parsedOptions);
        console.log('Options count:', parsedOptions.length);
      } catch(e) {
        console.log('Options parse error:', e.message);
      }

      try {
        const ca = q.correctAnswer || '';
        if (ca.startsWith('[')) {
          const parsedCA = JSON.parse(ca);
          console.log('CorrectAnswer (parsed):', parsedCA);
          console.log('CorrectAnswer count:', parsedCA.length);
        } else {
          console.log('CorrectAnswer (value):', ca);
        }
      } catch(e) {
        console.log('CorrectAnswer parse error:', e.message);
      }
      console.log('\n');
    });

    await prisma.$disconnect();
  } catch (err) {
    console.error('Error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

debugQuestions();
