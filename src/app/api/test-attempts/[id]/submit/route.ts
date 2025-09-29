import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Function to generate unique certificate number
function generateCertificateNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
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

    const body = await request.json();
    const { answers, department, workPosition, supervisor, evaluator, signatureData } = body;

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
      return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
    }

    if (attempt.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (attempt.completedAt) {
      return NextResponse.json({ error: 'Test already completed' }, { status: 400 });
    }

    // Calculate score with support for multiple correct answers
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of attempt.test.questions) {
      totalPoints += question.points;

      const userAnswer = answers[question.id];
      if (!userAnswer && question.required) continue;

      const correctAnswer = question.correctAnswer ? JSON.parse(question.correctAnswer) : null;

      if (question.type === 'single' || question.type === 'yesno') {
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
          userSet.forEach(answer => {
            if (correctSet.has(answer)) {
              correctSelections++;
            } else {
              incorrectSelections++;
            }
          });

          // Check for missing correct answers
          const missingCorrect = correctAnswer.filter(ans => !userSet.has(ans)).length;

          // Award partial points based on correct selections
          // Full points only if all correct and no incorrect selections
          if (correctSelections === correctAnswer.length && incorrectSelections === 0) {
            earnedPoints += question.points;
          } else if (correctSelections > 0) {
            // Partial credit: proportion of correct answers selected
            const partialScore = (correctSelections / correctAnswer.length) * question.points;
            // Deduct for wrong selections
            const penalty = (incorrectSelections * 0.25) * question.points;
            const finalScore = Math.max(0, partialScore - penalty);
            earnedPoints += Math.round(finalScore * 100) / 100; // Round to 2 decimal places
          }
        }
      } else if (question.type === 'text') {
        // For text questions, check if answer contains keywords
        if (correctAnswer && correctAnswer.startsWith('keywords:')) {
          const keywords = correctAnswer.replace('keywords:', '').split(',');
          const answerLower = userAnswer.toLowerCase();
          const hasAllKeywords = keywords.every((keyword: string) =>
            answerLower.includes(keyword.toLowerCase())
          );

          if (hasAllKeywords) {
            earnedPoints += question.points;
          }
        } else if (userAnswer.toLowerCase().trim() === correctAnswer?.toLowerCase().trim()) {
          // Exact match (case-insensitive)
          earnedPoints += question.points;
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
        answers: JSON.stringify(answers),
        department,
        workPosition,
        supervisor,
        evaluator,
        signatureData
      }
    });

    // If passed, generate certificate and update training completion
    if (passed) {
      const trainingCode = attempt.test.training.code;

      // Update user's training completion date dynamically based on training code
      const datumPoslField = `${trainingCode}DatumPosl`;
      const datumPristiField = `${trainingCode}DatumPristi`;

      await prisma.user.update({
        where: { id: parseInt(session.user.id) },
        data: {
          [datumPoslField]: new Date(),
          [datumPristiField]: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 year
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