import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateUserTrainingData } from '@/lib/training-sync';
import { isAdmin, isTrainer } from '@/types/roles';
import {
  ManualTestAttemptSchema,
  validateRequestBody
} from '@/lib/validation-schemas';
import {
  validateTestAccess,
  getTrainerAssignedTrainingIds
} from '@/lib/authorization';
import { randomUUID } from 'crypto';

/**
 * Generate unique certificate number using UUID to prevent collisions
 * Format: CERT-{YEAR}-{8-char-UUID}
 * Previous implementation used Math.random() which could collide under concurrent submissions
 */
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const uuid = randomUUID().split('-')[0].toUpperCase(); // 8 chars from UUID
  return `CERT-${year}-${uuid}`;
}

// POST - Create manual test attempt (for trainers/admins)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only trainers and admins can create manual test attempts
    if (!isAdmin(session.user.role) && !isTrainer(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(
      request,
      ManualTestAttemptSchema
    );
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { userId, testId, score, passed, notes } = validation.data;

    // SECURITY: Validate trainer has access to this test using centralized helper
    try {
      await validateTestAccess(session, testId);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Nedostatečná oprávnění' },
        { status: 403 }
      );
    }

    // Verify test exists and get training info (exclude soft-deleted tests)
    const test = await prisma.inspiritTest.findFirst({
      where: { id: testId, deletedAt: null },
      include: {
        training: true
      }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SECURITY & DATA INTEGRITY: Use transaction to ensure atomic operations
    // Prevents partial updates if any operation fails (test attempt created but certificate/training dates not updated)
    const result = await prisma.$transaction(async (tx) => {
      // Create manual test attempt
      const testAttempt = await tx.inspiritTestAttempt.create({
        data: {
          testId,
          userId,
          score,
          passed,
          startedAt: new Date(),
          completedAt: new Date(),
          answers: JSON.stringify({ manual: true, notes })
        }
      });

      let certificate = null;
      let trainingDatesUpdated = false;

      // If passed, update user's training dates and create certificate
      if (passed) {
        const trainingCode = test.training.code;

        // Update user's training completion date
        // Uses validated function with environment detection and SQL injection protection
        // DatumPristi is automatically calculated by the database from DatumPosl
        // TRANSACTION: Pass tx context to ensure atomic operations
        const updateSuccess = await updateUserTrainingData(
          userId,
          trainingCode,
          new Date(), // DatumPosl - DatumPristi auto-calculated by database
          undefined, // datumPristi - auto-calculated
          tx // CRITICAL: Transaction context for atomicity
        );

        if (!updateSuccess) {
          throw new Error('Failed to update training dates');
        }

        trainingDatesUpdated = true;

        // Create certificate with configurable validity per training
        const validityMs = (test.training.validityMonths ?? 12) * 30 * 24 * 60 * 60 * 1000;
        certificate = await tx.inspiritCertificate.create({
          data: {
            userId,
            trainingId: test.trainingId,
            testAttemptId: testAttempt.id,
            certificateNumber: generateCertificateNumber(),
            issuedAt: new Date(),
            validUntil: new Date(Date.now() + validityMs),
            pdfData: null // PDF will be generated separately
          }
        });
      }

      return { testAttempt, certificate, trainingDatesUpdated };
    });

    // Return success response based on transaction result
    if (result.certificate) {
      return NextResponse.json({
        success: true,
        message: 'Manual test result recorded successfully',
        testAttempt: {
          id: result.testAttempt.id,
          score,
          passed
        },
        certificate: {
          id: result.certificate.id,
          certificateNumber: result.certificate.certificateNumber,
          issuedAt: result.certificate.issuedAt,
          validUntil: result.certificate.validUntil
        },
        trainingDatesUpdated: result.trainingDatesUpdated
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Manual test result recorded successfully',
      testAttempt: {
        id: result.testAttempt.id,
        score,
        passed
      },
      trainingDatesUpdated: result.trainingDatesUpdated
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create manual test attempt' },
      { status: 500 }
    );
  }
}

// GET - Get manual test attempts for a user (for trainers/admins)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only trainers and admins can view manual test attempts
    if (!isAdmin(session.user.role) && !isTrainer(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const trainingId = searchParams.get('trainingId');
    const testId = searchParams.get('testId');
    const includeAll = searchParams.get('includeAll') === 'true'; // New parameter to include all attempts

    // Build where clause - userId is now optional
    let whereClause: any = {
      completedAt: { not: null }, // Only show completed attempts
      deletedAt: null // Exclude soft-deleted attempts
    };

    // Filter to manual tests only if includeAll is false
    if (!includeAll) {
      whereClause.answers = {
        contains: '"manual":true'
      };
    }

    // Filter by userId if provided
    if (userId) {
      whereClause.userId = parseInt(userId);
    }

    // Filter by testId if provided
    if (testId) {
      whereClause.testId = parseInt(testId);
    }

    // Filter by trainingId if provided
    if (trainingId) {
      whereClause.test = {
        trainingId: parseInt(trainingId),
        deletedAt: null // Exclude soft-deleted tests
      };
    } else {
      // Always exclude soft-deleted tests
      whereClause.test = {
        deletedAt: null
      };
    }

    // SECURITY: If trainer, filter to their assigned trainings only
    if (isTrainer(session.user.role)) {
      const assignedTrainingIds = await getTrainerAssignedTrainingIds(
        parseInt(session.user.id)
      );

      // Merge with existing test filter
      whereClause.test = {
        ...whereClause.test,
        trainingId: { in: assignedTrainingIds },
        deletedAt: null // Ensure soft-deleted tests are excluded
      };
    }

    const manualAttempts = await prisma.inspiritTestAttempt.findMany({
      where: whereClause,
      include: {
        test: {
          include: {
            training: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            cislo: true
          }
        },
        certificates: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      attempts: manualAttempts.map((attempt) => ({
        id: attempt.id,
        testId: attempt.testId,
        testTitle: attempt.test.title,
        trainingName: attempt.test.training.name,
        userName: `${attempt.user.firstName} ${attempt.user.lastName}`,
        userCislo: attempt.user.cislo,
        score: attempt.score,
        passed: attempt.passed,
        createdAt: attempt.createdAt,
        certificate: attempt.certificates[0] || null
      })),
      count: manualAttempts.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch manual test attempts' },
      { status: 500 }
    );
  }
}
