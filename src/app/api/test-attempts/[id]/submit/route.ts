import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get test attempt with test and questions
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            questions: true
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

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of attempt.test.questions) {
      totalPoints += question.points;
      
      const userAnswer = answers[question.id];
      if (!userAnswer) continue;

      const correctAnswer = question.correctAnswer ? JSON.parse(question.correctAnswer) : null;
      
      if (question.type === 'single' || question.type === 'yesno') {
        if (userAnswer === correctAnswer) {
          earnedPoints += question.points;
        }
      } else if (question.type === 'multiple') {
        // Check if arrays contain same elements
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
          const userSet = new Set(userAnswer);
          const correctSet = new Set(correctAnswer);
          
          if (userSet.size === correctSet.size && 
              [...userSet].every(item => correctSet.has(item))) {
            earnedPoints += question.points;
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
        }
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= attempt.test.passingScore;

    // Update test attempt
    await (prisma as any).testAttempt.update({
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

    // Update user's training completion date if passed
    if (passed) {
      await prisma.user.update({
        where: { id: parseInt(session.user.id) },
        data: {
          MonitorVyraCMTDiluDatumPosl: new Date(),
          MonitorVyraCMTDiluDatumPristi: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 year
        }
      });
    }

    return NextResponse.json({
      score: score.toFixed(1),
      passed,
      totalPoints,
      earnedPoints,
      passingScore: attempt.test.passingScore,
      message: passed 
        ? 'Gratulujeme! Test jste úspěšně složili.' 
        : 'Bohužel jste test nesložili. Zkuste to prosím znovu.'
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    return NextResponse.json(
      { error: 'Failed to submit test' },
      { status: 500 }
    );
  }
}