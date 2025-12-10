import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserTrainingData } from '@/lib/training-sync';

export async function GET(
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

    // Get active test for this training (exclude soft-deleted)
    const test = await prisma.inspiritTest.findFirst({
      where: {
        trainingId: trainingId,
        isActive: true,
        deletedAt: null
      },
      include: {
        training: true
      }
    });

    if (!test) {
      return NextResponse.json({
        canStart: false,
        reason: 'no_test',
        message: 'Pro toto školení není k dispozici žádný test'
      });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only apply restrictions for WORKER role
    if (user.role === 'WORKER') {
      const trainingCode = test.training.code;

      // Get training data
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
      const lastSuccessfulAttempt = await prisma.inspiritTestAttempt.findFirst({
        where: {
          testId: test.id,
          userId: parseInt(session.user.id),
          passed: true,
          completedAt: { not: null }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Count failed attempts AFTER the last successful attempt
      const failedAttempts = await prisma.inspiritTestAttempt.findMany({
        where: {
          testId: test.id,
          userId: parseInt(session.user.id),
          passed: false,
          completedAt: { not: null },
          deletedAt: null, // Exclude soft-deleted attempts
          ...(lastSuccessfulAttempt && {
            createdAt: {
              gt: lastSuccessfulAttempt.createdAt
            }
          })
        }
      });

      if (failedAttempts.length >= 2) {
        return NextResponse.json({
          canStart: false,
          reason: 'max_attempts',
          failedAttempts: failedAttempts.length,
          message:
            'Po dvou neúspěšných pokusech musíte absolvovat test osobně se školitelem'
        });
      }

      if (isRequired) {
        // Check if this is the first test
        const lastCompletionDate = trainingData.datumPosl;

        if (!lastCompletionDate) {
          return NextResponse.json({
            canStart: false,
            reason: 'first_test',
            message: 'První test musí být absolvován osobně se školitelem'
          });
        }

        // Check if user can retake test (one month before expiration)
        const nextDueDate = trainingData.datumPristi;

        if (nextDueDate) {
          const today = new Date();
          const dueDate = new Date(nextDueDate);
          const oneMonthBefore = new Date(dueDate);
          oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);

          if (today < oneMonthBefore) {
            const daysUntilAllowed = Math.ceil(
              (oneMonthBefore.getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return NextResponse.json({
              canStart: false,
              reason: 'too_early',
              nextAllowedDate: oneMonthBefore.toISOString(),
              daysUntilAllowed,
              message: `Test můžete opakovat až měsíc před vypršením platnosti (za ${daysUntilAllowed} dní)`
            });
          }
        }
      }
    }

    // Check if there's an unfinished attempt
    const existingAttempt = await prisma.inspiritTestAttempt.findFirst({
      where: {
        testId: test.id,
        userId: parseInt(session.user.id),
        completedAt: null
      }
    });

    return NextResponse.json({
      canStart: true,
      reason: existingAttempt ? 'continue_existing' : 'can_start',
      message: existingAttempt
        ? 'Můžete pokračovat v rozpracovaném testu'
        : 'Test je připraven ke spuštění'
    });
  } catch (error) {
    console.error('GET /api/trainings/[id]/test/check-eligibility error:', error);
    return NextResponse.json(
      { error: 'Failed to check test eligibility' },
      { status: 500 }
    );
  }
}
