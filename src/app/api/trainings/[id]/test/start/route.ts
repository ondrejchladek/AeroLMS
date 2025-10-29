import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        trainingId: trainingId,
        isActive: true // Only allow starting active tests
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

      // Build dynamic field names based on training code
      const datumPoslField = `${trainingCode}DatumPosl`;
      const datumPristiField = `${trainingCode}DatumPristi`;
      const pozadovanoField = `${trainingCode}Pozadovano`;

      // Check if training is required
      const isRequired = (user as any)[pozadovanoField] === true;

      if (isRequired) {
        // Check if this is the first test (no previous completion date)
        const lastCompletionDate = (user as any)[datumPoslField];

        if (!lastCompletionDate) {
          // First test must be taken in person
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
        const nextDueDate = (user as any)[datumPristiField];

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

        // Check number of failed attempts
        const failedAttempts = await prisma.testAttempt.findMany({
          where: {
            testId: testId,
            userId: parseInt(session.user.id),
            passed: false,
            completedAt: { not: null }
          }
        });

        if (failedAttempts.length >= 2) {
          // After 2 failed attempts, must take test in person
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
      }
    }

    // Check if there's an unfinished attempt for this specific test
    const existingAttempt = await prisma.testAttempt.findFirst({
      where: {
        testId: testId,
        userId: parseInt(session.user.id),
        completedAt: null
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
    const newAttempt = await prisma.testAttempt.create({
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
  } catch (error) {
    console.error('Error starting test:', error);
    return NextResponse.json(
      { error: 'Failed to start test' },
      { status: 500 }
    );
  }
}
