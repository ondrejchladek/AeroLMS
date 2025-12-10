import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateUserTrainingData } from '@/lib/training-sync';
import {
  SubmitTestSchema,
  validateRequestBody,
  safeJsonParse
} from '@/lib/validation-schemas';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const validation = await validateRequestBody(request, SubmitTestSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { answers } = validation.data;
    const attemptId = parseInt(id);

    // Get test attempt with test, questions and training
    const attempt = await prisma.inspiritTestAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            questions: {
              where: { deletedAt: null }, // Only active questions (not soft-deleted)
              orderBy: { order: 'asc' }
            },
            training: true
          }
        }
      }
    });

    if (!attempt || attempt.deletedAt !== null || attempt.test.deletedAt !== null) {
      return NextResponse.json(
        { error: 'Test attempt not found' },
        { status: 404 }
      );
    }

    if (attempt.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (attempt.completedAt) {
      return NextResponse.json(
        { error: 'Test already completed' },
        { status: 400 }
      );
    }

    // Calculate score with support for multiple correct answers
    // Scoring rules per CLAUDE.md:
    // - Single choice: 1 point if correct, 0 if wrong
    // - Multiple choice: +1 per correct selection, -1 per incorrect selection (minimum 0)
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of attempt.test.questions) {
      totalPoints += question.points;

      const userAnswer = answers[question.id];
      if (!userAnswer && question.required) continue;

      if (question.type === 'single') {
        // Single choice - correctAnswer is a plain string, NOT JSON
        const correctAnswer = question.correctAnswer;
        if (userAnswer === correctAnswer) {
          earnedPoints += question.points;
        }
      } else if (question.type === 'multiple') {
        // Multiple choice - correctAnswer is JSON array
        const correctAnswer = safeJsonParse(question.correctAnswer);

        // PENALTY SCORING: Award points for correct, penalize for incorrect
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
          const userSet = new Set(userAnswer);
          const correctSet = new Set(correctAnswer);

          // Count correct and incorrect selections
          let correctlySelected = 0;
          let wronglySelected = 0;

          userSet.forEach((answer) => {
            if (correctSet.has(answer)) {
              correctlySelected++;
            } else {
              wronglySelected++; // Penalty for wrong selection
            }
          });

          // Award points minus penalties (minimum 0 per question)
          // This prevents negative scores while still penalizing guessing
          const pointsForQuestion = Math.max(0, correctlySelected - wronglySelected);
          earnedPoints += pointsForQuestion;
        }
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= attempt.test.passingScore;

    // SECURITY & DATA INTEGRITY: Use transaction to ensure atomic operations
    // Prevents partial updates if any operation fails (test updated but training dates/certificate not updated)
    // PRODUCTION-SAFE: Transactions work with raw SQL ($executeRawUnsafe) for dynamic columns
    const result = await prisma.$transaction(async (tx) => {
      // Update test attempt
      await tx.inspiritTestAttempt.update({
        where: { id: attemptId },
        data: {
          completedAt: new Date(),
          score: score,
          passed: passed,
          answers: JSON.stringify(answers)
        }
      });

      let certificate = null;

      // If passed, generate certificate and update training completion
      if (passed) {
        const trainingCode = attempt.test.training.code;

        // Update user's training completion date
        // Uses validated function with environment detection and SQL injection protection
        // DatumPristi is automatically calculated by the database from DatumPosl
        // TRANSACTION: Pass tx context to ensure atomic operations with raw SQL
        const updateSuccess = await updateUserTrainingData(
          parseInt(session.user.id),
          trainingCode,
          new Date(), // DatumPosl - DatumPristi auto-calculated by database
          undefined, // datumPristi - auto-calculated
          tx // CRITICAL: Transaction context for atomicity (works with raw SQL!)
        );

        if (!updateSuccess) {
          throw new Error('Failed to update training dates');
        }

        // Create certificate record with configurable validity per training
        const validityMs = (attempt.test.training.validityMonths ?? 12) * 30 * 24 * 60 * 60 * 1000;
        certificate = await tx.inspiritCertificate.create({
          data: {
            userId: parseInt(session.user.id),
            trainingId: attempt.test.trainingId,
            testAttemptId: attemptId,
            certificateNumber: generateCertificateNumber(),
            issuedAt: new Date(),
            validUntil: new Date(Date.now() + validityMs),
            pdfData: null // PDF will be generated separately
          }
        });
      }

      return { certificate };
    });

    if (result.certificate) {
      return NextResponse.json({
        score: score.toFixed(1),
        passed,
        totalPoints,
        earnedPoints: earnedPoints.toFixed(2),
        passingScore: attempt.test.passingScore,
        message: 'Gratulujeme! Test jste úspěšně složili.',
        certificate: {
          id: result.certificate.id,
          certificateNumber: result.certificate.certificateNumber,
          issuedAt: result.certificate.issuedAt,
          validUntil: result.certificate.validUntil
        }
      });
    }

    return NextResponse.json({
      score: score.toFixed(1),
      passed,
      totalPoints,
      earnedPoints: earnedPoints.toFixed(2),
      passingScore: attempt.test.passingScore,
      message: 'Bohužel jste test nesložili. Zkuste to prosím znovu.'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit test' },
      { status: 500 }
    );
  }
}
