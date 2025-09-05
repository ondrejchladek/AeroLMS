import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const test = await prisma.test.findFirst({
      where: { trainingId: parseInt(id) },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Transform questions for frontend
    const transformedQuestions = test.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      question: q.question,
      options: q.options ? JSON.parse(q.options) : null,
      points: q.points,
      required: q.required
    }));

    return NextResponse.json({
      id: test.id,
      title: test.title,
      description: test.description,
      passingScore: test.passingScore,
      timeLimit: test.timeLimit,
      questions: transformedQuestions
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.email !== 'test@test.cz') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const trainingId = parseInt(id);
    const body = await request.json();
    const { title, description, passingScore, timeLimit, questions } = body;

    // Create test with questions in a transaction
    const test = await prisma.$transaction(async (tx) => {
      // Create the test
      const newTest = await tx.test.create({
        data: {
          trainingId,
          title,
          description,
          passingScore: passingScore || 70,
          timeLimit: timeLimit || null,
          isActive: true
        }
      });

      // Create questions
      if (questions && questions.length > 0) {
        await tx.testQuestion.createMany({
          data: questions.map((q: any) => ({
            testId: newTest.id,
            order: q.order,
            type: q.type || 'single',
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            points: q.points || 1,
            required: q.required !== false
          }))
        });
      }

      // Return test with questions
      return await tx.test.findUnique({
        where: { id: newTest.id },
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    return NextResponse.json({ test });
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json(
      { error: 'Failed to create test' },
      { status: 500 }
    );
  }
}
