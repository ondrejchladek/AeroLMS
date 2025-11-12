import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserTrainingData } from '@/lib/training-sync';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const trainingId = parseInt(id);

    // Get testId from request body
    const body = await request.json();
    const { testId } = body;

    if (!testId) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      );
    }

    // Verify test exists and belongs to this training
    const test = await prisma.inspiritTest.findFirst({
      where: {
        id: testId,
        trainingId: trainingId,
        isActive: true, // Only allow starting active tests
        deletedAt: null // Exclude soft-deleted tests
      },
      include: {
        training: true
      }
    });

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found or not active' },
        { status: 404 }
      );
    }

    // Get user data with training-specific fields
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only apply restrictions for WORKER role
    if (user.role === 'WORKER') {
      const trainingCode = test.training.code;

      // Get training data using raw SQL (Prisma can't access dynamic columns)
      // These columns exist in InspiritCisZam VIEW but are not in Prisma schema
      const trainingData = await getUserTrainingData(
        parseInt(session.user.id),
        trainingCode
      );

      if (!trainingData) {
        return NextResponse.json(
          { error: 'Training data not found' },
          { status: 404 }
        );
      }

      // Check if training is required
      const isRequired = trainingData.pozadovano === true;

      // SECURITY: Check number of failed attempts SINCE last successful attempt
      // (applies to ALL tests, not just required ones)
      //
      // IMPORTANT: "Successful attempt" includes:
      // 1. Online test completed by WORKER with passing score
      // 2. Manual test entry by TRAINER (for first in-person test or after max attempts)
      //
      // When TRAINER manually records a passing test, it RESETS the failed attempt counter,
      // giving the WORKER another 2 attempts for future tests.

      // First, find the most recent successful attempt (online OR manual by trainer)
      const lastSuccessfulAttempt = await prisma.inspiritTestAttempt.findFirst({
        where: {
          testId: testId,
          userId: parseInt(session.user.id),
          passed: true,
          completedAt: { not: null },
          deletedAt: null // Exclude soft-deleted attempts
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Count failed attempts AFTER the last successful attempt (or all if no success)
      // This includes:
      // - Tests failed by WORKER online (low score)
      // - Tests abandoned by WORKER (browser close, navigation away)
      //
      // If TRAINER manually recorded a passing test, only failed attempts AFTER that
      // manual entry are counted. This gives WORKER a fresh start with 2 new attempts.
      const failedAttempts = await prisma.inspiritTestAttempt.findMany({
        where: {
          testId: testId,
          userId: parseInt(session.user.id),
          passed: false,
          completedAt: { not: null }, // Only completed attempts (excludes in-progress)
          deletedAt: null, // Exclude soft-deleted attempts
          // Only count failed attempts AFTER last successful attempt
          ...(lastSuccessfulAttempt && {
            createdAt: {
              gt: lastSuccessfulAttempt.createdAt
            }
          })
        }
      });

      // DEBUG: Log attempt counter logic for verification
      console.log('[TEST START] Attempt counter check:', {
        userId: session.user.id,
        testId,
        lastSuccessfulAttempt: lastSuccessfulAttempt
          ? {
              id: lastSuccessfulAttempt.id,
              createdAt: lastSuccessfulAttempt.createdAt,
              passed: lastSuccessfulAttempt.passed
            }
          : null,
        failedAttemptsCount: failedAttempts.length,
        failedAttemptsDetails: failedAttempts.map((a) => ({
          id: a.id,
          createdAt: a.createdAt,
          score: a.score
        }))
      });

      if (failedAttempts.length >= 2) {
        // After 2 failed attempts since last success, must take test in person
        // WORKER must go to TRAINER who will conduct test in person and manually
        // record the result. If WORKER passes, the counter resets and they get
        // 2 new attempts for future tests. If they fail in person, TRAINER decides
        // next steps (additional training, etc.)
        return NextResponse.json(
          {
            error:
              'Po dvou neúspěšných pokusech musíte absolvovat test osobně se školitelem',
            errorCode: 'MAX_ATTEMPTS_REACHED',
            requiresInPerson: true,
            failedAttempts: failedAttempts.length
          },
          { status: 403 }
        );
      }

      if (isRequired) {
        // Check if this is the first test (no previous completion date)
        const lastCompletionDate = trainingData.datumPosl;

        if (!lastCompletionDate) {
          // First test must be taken in person with TRAINER
          // TRAINER will manually record the result using /api/test-attempts/manual
          // After that, WORKER can take future tests online (within retake period)
          return NextResponse.json(
            {
              error: 'První test musí být absolvován osobně se školitelem',
              errorCode: 'FIRST_TEST_REQUIRED',
              requiresInPerson: true
            },
            { status: 403 }
          );
        }

        // Check if user can retake test (one month before expiration)
        const nextDueDate = trainingData.datumPristi;

        if (nextDueDate) {
          const today = new Date();
          const dueDate = new Date(nextDueDate);
          const oneMonthBefore = new Date(dueDate);
          oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);

          // Check if we're within the allowed retake period
          if (today < oneMonthBefore) {
            const daysUntilAllowed = Math.ceil(
              (oneMonthBefore.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return NextResponse.json(
              {
                error: `Test můžete opakovat až měsíc před vypršením platnosti (za ${daysUntilAllowed} dní)`,
                errorCode: 'TOO_EARLY_TO_RETAKE',
                nextAllowedDate: oneMonthBefore.toISOString(),
                daysUntilAllowed
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Check if there's an unfinished attempt for this specific test
    const existingAttempt = await prisma.inspiritTestAttempt.findFirst({
      where: {
        testId: testId,
        userId: parseInt(session.user.id),
        completedAt: null,
        deletedAt: null // Exclude soft-deleted attempts
      }
    });

    if (existingAttempt) {
      return NextResponse.json({
        attemptId: existingAttempt.id,
        testId: testId,
        message: 'Continuing existing test attempt'
      });
    }

    // Create new test attempt
    const newAttempt = await prisma.inspiritTestAttempt.create({
      data: {
        testId: testId,
        userId: parseInt(session.user.id),
        startedAt: new Date()
      }
    });

    return NextResponse.json({
      attemptId: newAttempt.id,
      testId: testId,
      message: 'Test started successfully'
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to start test' },
      { status: 500 }
    );
  }
}
