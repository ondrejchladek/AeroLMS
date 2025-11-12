import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/deleted-data
 * List all soft-deleted trainings with counts of related entities
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    // Get all soft-deleted trainings
    const deletedTrainings = await prisma.inspiritTraining.findMany({
      where: {
        deletedAt: { not: null }
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        deletedAt: true,
        tests: {
          where: { deletedAt: { not: null } },
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
        },
        certificates: {
          where: { deletedAt: { not: null } },
          select: { id: true }
        },
        trainingAssignments: {
          where: { deletedAt: { not: null } },
          select: { id: true }
        }
      },
      orderBy: { deletedAt: 'desc' }
    });

    // Format response with counts
    const formattedData = deletedTrainings.map((training) => {
      const testCount = training.tests.length;
      const questionCount = training.tests.reduce((sum, test) => sum + test.questions.length, 0);
      const attemptCount = training.tests.reduce((sum, test) => sum + test.testAttempts.length, 0);
      const certificateCount = training.certificates.length;
      const assignmentCount = training.trainingAssignments.length;

      return {
        id: training.id,
        code: training.code,
        name: training.name,
        description: training.description,
        deletedAt: training.deletedAt,
        counts: {
          tests: testCount,
          questions: questionCount,
          testAttempts: attemptCount,
          certificates: certificateCount,
          trainingAssignments: assignmentCount,
          total: testCount + questionCount + attemptCount + certificateCount + assignmentCount
        }
      };
    });

    // Get soft-deleted tests (where test is deleted but training is NOT deleted)
    const deletedTests = await prisma.inspiritTest.findMany({
      where: {
        deletedAt: { not: null },
        training: {
          deletedAt: null // Training is NOT deleted (orphaned tests)
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        deletedAt: true,
        training: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        questions: {
          where: { deletedAt: { not: null } },
          select: { id: true }
        },
        testAttempts: {
          where: { deletedAt: { not: null } },
          select: {
            id: true,
            certificates: {
              where: { deletedAt: { not: null } },
              select: { id: true }
            }
          }
        }
      },
      orderBy: { deletedAt: 'desc' }
    });

    // Format deleted tests with counts
    const formattedTests = deletedTests.map((test) => {
      const questionCount = test.questions.length;
      const attemptCount = test.testAttempts.length;
      const certificateCount = test.testAttempts.reduce(
        (sum, attempt) => sum + attempt.certificates.length,
        0
      );

      return {
        id: test.id,
        title: test.title,
        description: test.description,
        deletedAt: test.deletedAt,
        training: test.training,
        counts: {
          questions: questionCount,
          testAttempts: attemptCount,
          certificates: certificateCount,
          total: questionCount + attemptCount + certificateCount
        }
      };
    });

    return NextResponse.json({
      deletedTrainings: formattedData,
      deletedTests: formattedTests,
      totalCount: formattedData.length + formattedTests.length
    });
  } catch (error) {
    console.error('[GET /api/admin/deleted-data] Error:', error);
    return NextResponse.json(
      { error: 'Chyba při načítání smazaných dat' },
      { status: 500 }
    );
  }
}
