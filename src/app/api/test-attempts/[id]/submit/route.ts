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

// Function to generate unique certificate number
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `CERT-${year}-${random}`;
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
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of attempt.test.questions) {
      totalPoints += question.points;

      const userAnswer = answers[question.id];
      if (!userAnswer && question.required) continue;

      // DEBUG: Log comparison
      console.log('🔍 DEBUG Question ID:', question.id);
      console.log('   Question:', question.question.substring(0, 50));
      console.log('   Type:', question.type);
      console.log('   Question Points:', question.points);
      console.log('   User Answer:', userAnswer);
      console.log('   User Answer Type:', typeof userAnswer);
      console.log('   Correct Answer (raw):', question.correctAnswer);

      if (question.type === 'single') {
        // Single choice - correctAnswer is a plain string, NOT JSON
        const correctAnswer = question.correctAnswer;
        console.log('   Correct Answer (string):', correctAnswer);
        console.log('   Match?:', userAnswer === correctAnswer);

        if (userAnswer === correctAnswer) {
          earnedPoints += question.points;
          console.log(`   ✅ Points awarded: ${question.points}`);
        } else {
          console.log(`   ❌ No points awarded`);
        }
      } else if (question.type === 'multiple') {
        // Multiple choice - correctAnswer is JSON array
        const correctAnswer = safeJsonParse(question.correctAnswer);
        console.log('   Correct Answer (parsed array):', correctAnswer);

        // DIRECT SCORING: 1 point per correct answer selected
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
          const userSet = new Set(userAnswer);
          const correctSet = new Set(correctAnswer);

          // Count how many correct answers the user selected
          let correctlySelected = 0;
          userSet.forEach((answer) => {
            if (correctSet.has(answer)) {
              correctlySelected++;
            }
          });

          // Award 1 point for each correctly selected answer
          earnedPoints += correctlySelected;

          console.log(`   Correctly selected: ${correctlySelected} out of ${correctAnswer.length}`);
          console.log(`   ✅ Points awarded: ${correctlySelected}`);
        }
      }
      console.log('---');
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

        // Create certificate record
        certificate = await tx.inspiritCertificate.create({
          data: {
            userId: parseInt(session.user.id),
            trainingId: attempt.test.trainingId,
            testAttemptId: attemptId,
            certificateNumber: generateCertificateNumber(),
            issuedAt: new Date(),
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 year
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
