import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/admin/deleted-data/clean
 * Permanently delete a soft-deleted training and all related data
 * Admin only - IRREVERSIBLE OPERATION
 *
 * Body: { trainingId: number } - Delete specific training
 * OR
 * Body: { olderThanDays: number } - Delete all trainings deleted before X days
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { trainingId, testId, olderThanDays } = body;

    // Single test deletion
    if (testId !== undefined) {
      if (typeof testId !== 'number') {
        return NextResponse.json(
          { error: 'Neplatné testId' },
          { status: 400 }
        );
      }

      const result = await deleteSingleTest(testId);
      return NextResponse.json(result);
    }

    // Single training deletion
    if (trainingId !== undefined) {
      if (typeof trainingId !== 'number') {
        return NextResponse.json(
          { error: 'Neplatné trainingId' },
          { status: 400 }
        );
      }

      const result = await deleteSingleTraining(trainingId);
      return NextResponse.json(result);
    }

    // Bulk deletion by age
    if (olderThanDays !== undefined) {
      if (typeof olderThanDays !== 'number' || olderThanDays < 1) {
        return NextResponse.json(
          { error: 'olderThanDays musí být kladné číslo' },
          { status: 400 }
        );
      }

      const result = await deleteOldTrainings(olderThanDays);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Chybí parametr trainingId, testId nebo olderThanDays' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[DELETE /api/admin/deleted-data/clean] Error:', error);
    return NextResponse.json(
      { error: 'Chyba při mazání dat' },
      { status: 500 }
    );
  }
}

/**
 * Permanently delete a single soft-deleted test
 */
async function deleteSingleTest(testId: number): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
  test?: {
    id: number;
    title: string;
  };
  deletedCounts?: {
    questions: number;
    testAttempts: number;
    certificates: number;
  };
}> {
  try {
    // Check if test exists and is soft-deleted
    const test = await prisma.inspiritTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        title: true,
        deletedAt: true,
        training: {
          select: { code: true, name: true }
        }
      }
    });

    if (!test) {
      return {
        success: false,
        error: 'Test nenalezen',
        status: 404
      };
    }

    if (!test.deletedAt) {
      return {
        success: false,
        error: 'Test není smazaný - nelze trvale odstranit',
        status: 400
      };
    }

    // Get counts before deletion for reporting
    const counts = await getTestCounts(testId);

    // Hard delete cascade
    await hardDeleteTestCascade(testId);

    return {
      success: true,
      message: `Test "${test.title}" (${test.training.code}) byl trvale smazán`,
      test: {
        id: test.id,
        title: test.title
      },
      deletedCounts: counts
    };
  } catch (error) {
    console.error(`[deleteSingleTest] Error for test ${testId}:`, error);
    throw error;
  }
}

/**
 * Permanently delete a single soft-deleted training
 */
async function deleteSingleTraining(trainingId: number): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  status?: number;
  training?: {
    id: number;
    code: string;
    name: string;
  };
  deletedCounts?: {
    tests: number;
    questions: number;
    testAttempts: number;
    certificates: number;
    trainingAssignments: number;
  };
}> {
  try {
    // Check if training exists and is soft-deleted
    const training = await prisma.inspiritTraining.findUnique({
      where: { id: trainingId },
      select: { id: true, code: true, name: true, deletedAt: true }
    });

    if (!training) {
      return {
        success: false,
        error: 'Školení nenalezeno',
        status: 404
      };
    }

    if (!training.deletedAt) {
      return {
        success: false,
        error: 'Školení není smazané - nelze trvale odstranit',
        status: 400
      };
    }

    // Get counts before deletion for reporting
    const counts = await getTrainingCounts(trainingId);

    // Hard delete cascade
    await hardDeleteTrainingCascade(trainingId);

    return {
      success: true,
      message: `Školení ${training.code} (${training.name}) bylo trvale smazáno`,
      training: {
        id: training.id,
        code: training.code,
        name: training.name
      },
      deletedCounts: counts
    };
  } catch (error) {
    console.error(`[deleteSingleTraining] Error for training ${trainingId}:`, error);
    throw error;
  }
}

/**
 * Permanently delete all trainings soft-deleted before X days
 */
async function deleteOldTrainings(olderThanDays: number) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Find all trainings deleted before cutoff
    const oldTrainings = await prisma.inspiritTraining.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate
        }
      },
      select: { id: true, code: true, name: true, deletedAt: true }
    });

    if (oldTrainings.length === 0) {
      return {
        success: true,
        message: `Žádná školení smazaná před více než ${olderThanDays} dny`,
        deletedCount: 0,
        trainings: []
      };
    }

    // Delete each training with cascade
    const deletedTrainings = [];
    let totalCounts = {
      tests: 0,
      questions: 0,
      testAttempts: 0,
      certificates: 0,
      trainingAssignments: 0
    };

    for (const training of oldTrainings) {
      const counts = await getTrainingCounts(training.id);
      await hardDeleteTrainingCascade(training.id);

      deletedTrainings.push({
        code: training.code,
        name: training.name,
        deletedAt: training.deletedAt
      });

      totalCounts.tests += counts.tests;
      totalCounts.questions += counts.questions;
      totalCounts.testAttempts += counts.testAttempts;
      totalCounts.certificates += counts.certificates;
      totalCounts.trainingAssignments += counts.trainingAssignments;
    }

    return {
      success: true,
      message: `Trvale smazáno ${oldTrainings.length} školení starších než ${olderThanDays} dní`,
      deletedCount: oldTrainings.length,
      trainings: deletedTrainings,
      totalCounts
    };
  } catch (error) {
    console.error(`[deleteOldTrainings] Error:`, error);
    throw error;
  }
}

/**
 * Get counts of related entities for a training
 */
async function getTrainingCounts(trainingId: number) {
  const tests = await prisma.inspiritTest.findMany({
    where: { trainingId, deletedAt: { not: null } },
    select: {
      id: true,
      questions: {
        where: { deletedAt: { not: null } },
        select: { id: true }
      },
      testAttempts: {
        where: { deletedAt: { not: null } },
        select: { id: true }
      }
    }
  });

  const certificates = await prisma.inspiritCertificate.count({
    where: { trainingId, deletedAt: { not: null } }
  });

  const assignments = await prisma.inspiritTrainingAssignment.count({
    where: { trainingId, deletedAt: { not: null } }
  });

  const testCount = tests.length;
  const questionCount = tests.reduce((sum, test) => sum + test.questions.length, 0);
  const attemptCount = tests.reduce((sum, test) => sum + test.testAttempts.length, 0);

  return {
    tests: testCount,
    questions: questionCount,
    testAttempts: attemptCount,
    certificates,
    trainingAssignments: assignments
  };
}

/**
 * Permanently delete training and all related entities
 * IRREVERSIBLE - hard delete from database
 */
async function hardDeleteTrainingCascade(trainingId: number): Promise<void> {
  try {
    // Get all tests for this training
    const tests = await prisma.inspiritTest.findMany({
      where: { trainingId },
      select: { id: true }
    });
    const testIds = tests.map((t) => t.id);

    if (testIds.length > 0) {
      // Delete certificates first (has FK to testAttempt with CASCADE)
      await prisma.inspiritCertificate.deleteMany({
        where: { testAttemptId: { in: await getTestAttemptIds(testIds) } }
      });

      // Delete test attempts
      await prisma.inspiritTestAttempt.deleteMany({
        where: { testId: { in: testIds } }
      });

      // Delete questions
      await prisma.inspiritQuestion.deleteMany({
        where: { testId: { in: testIds } }
      });

      // Delete tests
      await prisma.inspiritTest.deleteMany({
        where: { id: { in: testIds } }
      });
    }

    // Delete training assignments
    await prisma.inspiritTrainingAssignment.deleteMany({
      where: { trainingId }
    });

    // Delete certificates directly linked to training
    await prisma.inspiritCertificate.deleteMany({
      where: { trainingId }
    });

    // Finally delete the training itself
    await prisma.inspiritTraining.delete({
      where: { id: trainingId }
    });

    console.log(`[hardDeleteCascade] Permanently deleted training ${trainingId} and all related data`);
  } catch (error) {
    console.error(`[hardDeleteCascade] Error for training ${trainingId}:`, error);
    throw error;
  }
}

/**
 * Get counts of related entities for a test
 */
async function getTestCounts(testId: number): Promise<{
  questions: number;
  testAttempts: number;
  certificates: number;
}> {
  const questions = await prisma.inspiritQuestion.count({
    where: { testId, deletedAt: { not: null } }
  });

  const testAttempts = await prisma.inspiritTestAttempt.count({
    where: { testId, deletedAt: { not: null } }
  });

  // Get certificates for this test's attempts
  const attempts = await prisma.inspiritTestAttempt.findMany({
    where: { testId, deletedAt: { not: null } },
    select: { id: true }
  });
  const attemptIds = attempts.map((a) => a.id);

  const certificates = attemptIds.length > 0
    ? await prisma.inspiritCertificate.count({
        where: {
          testAttemptId: { in: attemptIds },
          deletedAt: { not: null }
        }
      })
    : 0;

  return {
    questions,
    testAttempts,
    certificates
  };
}

/**
 * Permanently delete test and all related entities
 * IRREVERSIBLE - hard delete from database
 */
async function hardDeleteTestCascade(testId: number): Promise<void> {
  try {
    // Get all test attempts for this test
    const testAttempts = await prisma.inspiritTestAttempt.findMany({
      where: { testId },
      select: { id: true }
    });
    const attemptIds = testAttempts.map((a) => a.id);

    if (attemptIds.length > 0) {
      // Delete certificates first (has FK to testAttempt)
      await prisma.inspiritCertificate.deleteMany({
        where: { testAttemptId: { in: attemptIds } }
      });
    }

    // Delete test attempts
    await prisma.inspiritTestAttempt.deleteMany({
      where: { testId }
    });

    // Delete questions
    await prisma.inspiritQuestion.deleteMany({
      where: { testId }
    });

    // Finally delete the test itself
    await prisma.inspiritTest.delete({
      where: { id: testId }
    });

    console.log(`[hardDeleteTestCascade] Permanently deleted test ${testId} and all related data`);
  } catch (error) {
    console.error(`[hardDeleteTestCascade] Error for test ${testId}:`, error);
    throw error;
  }
}

/**
 * Helper to get all test attempt IDs for given test IDs
 */
async function getTestAttemptIds(testIds: number[]): Promise<number[]> {
  const attempts = await prisma.inspiritTestAttempt.findMany({
    where: { testId: { in: testIds } },
    select: { id: true }
  });
  return attempts.map((a) => a.id);
}
