import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await context.params;
    const body = await request.json();
    const { questions } = body;

    // Smazat existující otázky
    await prisma.question.deleteMany({
      where: { testId: parseInt(testId) }
    });

    // Vložit nové otázky
    const createdQuestions = await prisma.question.createMany({
      data: questions.map((q: any, index: number) => ({
        testId: parseInt(testId),
        order: index + 1,
        type: q.type || 'single',
        question: q.question,
        options: JSON.stringify(q.options),
        correctAnswer: JSON.stringify(q.correctAnswer.toString()),
        points: q.points || 1,
        required: q.required !== false
      }))
    });

    return NextResponse.json({ 
      success: true, 
      count: createdQuestions.count 
    });
  } catch (error) {
    console.error('Error updating test questions:', error);
    return NextResponse.json(
      { error: 'Failed to update questions' },
      { status: 500 }
    );
  }
}