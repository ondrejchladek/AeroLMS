import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer } from '@/types/roles';

// Function to generate unique certificate number
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `CERT-${year}-${random}`;
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
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      testId,
      score,
      passed,
      employeeCode,
      employeeName,
      department,
      workPosition,
      supervisor,
      evaluator,
      notes
    } = body;

    // Validate required fields
    if (!userId || !testId || score === undefined || passed === undefined) {
      return NextResponse.json({
        error: 'Missing required fields: userId, testId, score, passed'
      }, { status: 400 });
    }

    // Verify test exists and get training info
    const test = await prisma.test.findUnique({
      where: { id: testId },
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

    // If trainer, check if they're assigned to this training
    if (isTrainer(session.user.role)) {
      const assignment = await prisma.trainingAssignment.findFirst({
        where: {
          trainerId: parseInt(session.user.id),
          trainingId: test.trainingId
        }
      });

      if (!assignment) {
        return NextResponse.json({
          error: 'You are not assigned to this training'
        }, { status: 403 });
      }
    }

    // Create manual test attempt
    const testAttempt = await prisma.testAttempt.create({
      data: {
        testId,
        userId,
        score,
        passed,
        employeeCode: employeeCode || user.code,
        employeeName: employeeName || user.name,
        department,
        workPosition,
        supervisor,
        evaluator: evaluator || session.user.name,
        startedAt: new Date(),
        completedAt: new Date(),
        answers: JSON.stringify({ manual: true, notes })
      }
    });

    // If passed, update user's training dates and create certificate
    if (passed) {
      const trainingCode = test.training.code;
      const datumPoslField = `${trainingCode}DatumPosl`;

      // Update user's training completion date
      // DatumPristi is automatically calculated by the database from DatumPosl
      await prisma.user.update({
        where: { id: userId },
        data: {
          [datumPoslField]: new Date()
        }
      });

      // Create certificate
      const certificate = await prisma.certificate.create({
        data: {
          userId,
          trainingId: test.trainingId,
          testAttemptId: testAttempt.id,
          certificateNumber: generateCertificateNumber(),
          issuedAt: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 year
          pdfData: null // PDF will be generated separately
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Manual test result recorded successfully',
        testAttempt: {
          id: testAttempt.id,
          score,
          passed,
          evaluator: testAttempt.evaluator
        },
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          issuedAt: certificate.issuedAt,
          validUntil: certificate.validUntil
        },
        trainingDatesUpdated: true
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Manual test result recorded successfully',
      testAttempt: {
        id: testAttempt.id,
        score,
        passed,
        evaluator: testAttempt.evaluator
      },
      trainingDatesUpdated: false
    });
  } catch (error) {
    console.error('Error creating manual test attempt:', error);
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
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const trainingId = searchParams.get('trainingId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Build where clause
    let whereClause: any = {
      userId: parseInt(userId),
      answers: {
        contains: '"manual":true'
      }
    };

    if (trainingId) {
      whereClause = {
        ...whereClause,
        test: {
          trainingId: parseInt(trainingId)
        }
      };
    }

    // If trainer, filter to their assigned trainings
    if (isTrainer(session.user.role)) {
      const assignments = await prisma.trainingAssignment.findMany({
        where: { trainerId: parseInt(session.user.id) },
        select: { trainingId: true }
      });

      const assignedTrainingIds = assignments.map(a => a.trainingId);

      whereClause = {
        ...whereClause,
        test: {
          ...whereClause.test,
          trainingId: { in: assignedTrainingIds }
        }
      };
    }

    const manualAttempts = await prisma.testAttempt.findMany({
      where: whereClause,
      include: {
        test: {
          include: {
            training: true
          }
        },
        certificates: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      attempts: manualAttempts.map(attempt => ({
        id: attempt.id,
        testId: attempt.testId,
        testTitle: attempt.test.title,
        trainingName: attempt.test.training.name,
        score: attempt.score,
        passed: attempt.passed,
        evaluator: attempt.evaluator,
        createdAt: attempt.createdAt,
        certificate: attempt.certificates[0] || null
      })),
      count: manualAttempts.length
    });
  } catch (error) {
    console.error('Error fetching manual test attempts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual test attempts' },
      { status: 500 }
    );
  }
}