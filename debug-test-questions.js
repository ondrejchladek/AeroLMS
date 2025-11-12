// Debug script to check test and question status
// Usage: node debug-test-questions.js <trainingId>

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTestQuestions(trainingId) {
  try {
    console.log(`\n=== Debugging Tests for Training ID: ${trainingId} ===\n`);

    // Get all tests for this training (including soft-deleted)
    const tests = await prisma.inspiritTest.findMany({
      where: {
        trainingId: parseInt(trainingId)
      },
      include: {
        questions: true // Include all questions, even soft-deleted
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (tests.length === 0) {
      console.log('❌ No tests found for this training');
      return;
    }

    console.log(`Found ${tests.length} test(s):\n`);

    for (const test of tests) {
      console.log(`Test ID: ${test.id}`);
      console.log(`  Title: ${test.title}`);
      console.log(`  Active: ${test.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`  Deleted: ${test.deletedAt ? `❌ YES (${test.deletedAt})` : '✅ NO'}`);
      console.log(`  Created: ${test.createdAt}`);
      console.log(`  Total Questions: ${test.questions.length}`);

      // Check questions
      const activeQuestions = test.questions.filter(q => q.deletedAt === null);
      const deletedQuestions = test.questions.filter(q => q.deletedAt !== null);

      console.log(`  Active Questions: ${activeQuestions.length}`);
      console.log(`  Soft-Deleted Questions: ${deletedQuestions.length}`);

      if (activeQuestions.length > 0) {
        console.log('\n  Active Questions:');
        activeQuestions.forEach(q => {
          console.log(`    - Q${q.order}: ${q.question.substring(0, 50)}... (${q.type}, ${q.points} pts)`);
        });
      }

      if (deletedQuestions.length > 0) {
        console.log('\n  ⚠️  Soft-Deleted Questions:');
        deletedQuestions.forEach(q => {
          console.log(`    - Q${q.order}: ${q.question.substring(0, 50)}... (deleted: ${q.deletedAt})`);
        });
      }

      console.log('\n' + '='.repeat(60) + '\n');
    }

    // Summary
    const activeTests = tests.filter(t => t.isActive && !t.deletedAt);
    console.log('📊 Summary:');
    console.log(`  Total tests: ${tests.length}`);
    console.log(`  Active tests: ${activeTests.length}`);

    if (activeTests.length > 1) {
      console.log('\n  ⚠️  WARNING: Multiple active tests found! Only one should be active.');
      console.log('  Active test IDs:', activeTests.map(t => t.id).join(', '));
    } else if (activeTests.length === 0) {
      console.log('\n  ⚠️  WARNING: No active tests found!');
    } else {
      const activeTest = activeTests[0];
      const activeQuestionsCount = activeTest.questions.filter(q => !q.deletedAt).length;
      console.log(`\n  ✅ One active test (ID: ${activeTest.id})`);
      console.log(`  Active questions: ${activeQuestionsCount}`);

      if (activeQuestionsCount === 0) {
        console.log('  ❌ PROBLEM: Active test has NO active questions!');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get trainingId from command line
const trainingId = process.argv[2];

if (!trainingId) {
  console.log('Usage: node debug-test-questions.js <trainingId>');
  console.log('Example: node debug-test-questions.js 1');
  process.exit(1);
}

debugTestQuestions(trainingId);
