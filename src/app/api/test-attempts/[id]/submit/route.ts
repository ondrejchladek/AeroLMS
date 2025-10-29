import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            questions: true,
            training: true
          }
        }
      }
    });

    if (!attempt) {
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

      const correctAnswer = safeJsonParse(question.correctAnswer);

      if (question.type === 'single') {
        // Single choice - full points if correct
        if (userAnswer === correctAnswer) {
          earnedPoints += question.points;
        }
      } else if (question.type === 'multiple') {
        // Multiple choice - partial points for each correct answer
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
          const userSet = new Set(userAnswer);
          const correctSet = new Set(correctAnswer);

          // Calculate partial points: each correct selection gets points
          let correctSelections = 0;
          let incorrectSelections = 0;

          // Count correct selections
          userSet.forEach((answer) => {
            if (correctSet.has(answer)) {
              correctSelections++;
            } else {
              incorrectSelections++;
            }
          });

          // Check for missing correct answers
          const missingCorrect = correctAnswer.filter(
            (ans) => !userSet.has(ans)
          ).length;

          // Award partial points based on correct selections
          // Full points only if all correct and no incorrect selections
          if (
            correctSelections === correctAnswer.length &&
            incorrectSelections === 0
          ) {
            earnedPoints += question.points;
          } else if (correctSelections > 0) {
            // Partial credit: proportion of correct answers selected
            const partialScore =
              (correctSelections / correctAnswer.length) * question.points;
            // Deduct for wrong selections
            const penalty = incorrectSelections * 0.25 * question.points;
            const finalScore = Math.max(0, partialScore - penalty);
            earnedPoints += Math.round(finalScore * 100) / 100; // Round to 2 decimal places
          }
        }
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= attempt.test.passingScore;

    // Update test attempt
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score: score,
        passed: passed,
        answers: JSON.stringify(answers)
      }
    });

    // If passed, generate certificate and update training completion
    if (passed) {
      const trainingCode = attempt.test.training.code;

      // Update user's training completion date dynamically based on training code
      // DatumPristi is automatically calculated by the database from DatumPosl
      const datumPoslField = `${trainingCode}DatumPosl`;

      await prisma.user.update({
        where: { id: parseInt(session.user.id) },
        data: {
          [datumPoslField]: new Date()
        }
      });

      // Create certificate record
      const certificate = await prisma.certificate.create({
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

      return NextResponse.json({
        score: score.toFixed(1),
        passed,
        totalPoints,
        earnedPoints: earnedPoints.toFixed(2),
        passingScore: attempt.test.passingScore,
        message: 'Gratulujeme! Test jste úspěšně složili.',
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          issuedAt: certificate.issuedAt,
          validUntil: certificate.validUntil
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
    console.error('Error submitting test:', error);
    return NextResponse.json(
      { error: 'Failed to submit test' },
      { status: 500 }
    );
  }
}
