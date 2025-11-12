import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer } from '@/types/roles';
import { getTrainerAssignedTrainingIds } from '@/lib/authorization';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attemptId = parseInt(id);

    // Fetch test attempt with all related data
    const attempt = await prisma.inspiritTestAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            questions: {
              where: { deletedAt: null }, // Only active questions
              orderBy: { order: 'asc' }
            },
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
      }
    });

    if (!attempt || attempt.deletedAt !== null || attempt.test.deletedAt !== null) {
      return NextResponse.json(
        { error: 'Test attempt not found' },
        { status: 404 }
      );
    }

    // SECURITY: Check access permissions
    // Workers can only view their own attempts
    // Trainers can only view attempts for their assigned trainings
    // Admins can view all attempts
    if (!isAdmin(session.user.role)) {
      if (isTrainer(session.user.role)) {
        // Check if trainer is assigned to this training
        const assignedTrainingIds = await getTrainerAssignedTrainingIds(
          parseInt(session.user.id)
        );
        if (!assignedTrainingIds.includes(attempt.test.trainingId)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      } else {
        // Worker - can only view their own attempts
        if (attempt.userId !== parseInt(session.user.id)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }
    }

    // Parse answers JSON
    let answersData = null;
    let isManual = false;
    let notes = null;

    if (attempt.answers) {
      try {
        answersData = JSON.parse(attempt.answers);
        // Check if this is a manual test entry
        if (answersData.manual === true) {
          isManual = true;
          notes = answersData.notes || null;
          answersData = null; // Clear answers for manual tests
        }
      } catch {
        // Invalid JSON, treat as no answers
        answersData = null;
      }
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        isManual,
        notes,
        answers: answersData
      },
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        passingScore: attempt.test.passingScore,
        timeLimit: attempt.test.timeLimit,
        questions: attempt.test.questions.map((q) => ({
          id: q.id,
          order: q.order,
          type: q.type,
          question: q.question,
          options: q.options ? JSON.parse(q.options) : null,
          correctAnswer: q.correctAnswer,
          points: q.points,
          required: q.required
        }))
      },
      training: {
        id: attempt.test.training.id,
        name: attempt.test.training.name,
        code: attempt.test.training.code
      },
      user: {
        id: attempt.user.id,
        firstName: attempt.user.firstName,
        lastName: attempt.user.lastName,
        cislo: attempt.user.cislo
      },
      certificate: attempt.certificates[0] || null
    });
  } catch (error) {
    console.error('Error fetching test attempt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test attempt' },
      { status: 500 }
    );
  }
}
