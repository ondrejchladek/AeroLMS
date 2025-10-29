import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer } from '@/types/roles';
import {
  CreateTestSchema,
  validateRequestBody,
  safeJsonParse
} from '@/lib/validation-schemas';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Získat všechny testy pro dané školení
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const trainingId = parseInt(id);

    if (isNaN(trainingId)) {
      return NextResponse.json(
        { error: 'Invalid training ID' },
        { status: 400 }
      );
    }

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true }
    });

    // WORKER sees only active test, others see all tests
    const whereClause =
      user?.role === 'WORKER'
        ? {
            trainingId: trainingId,
            isActive: true
          }
        : {
            trainingId: trainingId
          };

    // Získej testy podle role
    const tests = await prisma.test.findMany({
      where: whereClause,
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            testAttempts: true,
            questions: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Transform tests
    const transformedTests = tests.map((test: any) => ({
      id: test.id,
      title: test.title,
      description: test.description,
      passingScore: test.passingScore,
      timeLimit: test.timeLimit,
      isActive: test.isActive,
      validFrom: test.validFrom,
      validTo: test.validTo,
      questionsCount: test._count.questions,
      attemptsCount: test._count.testAttempts,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
      questions: test.questions.map((q: any) => ({
        id: q.id,
        order: q.order,
        type: q.type,
        question: q.question,
        options: safeJsonParse(q.options),
        points: q.points,
        required: q.required
      }))
    }));

    return NextResponse.json({
      tests: transformedTests,
      count: transformedTests.length
    });
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    );
  }
}

// POST - Vytvořit nový test pro školení
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const trainingId = parseInt(id);

    if (isNaN(trainingId)) {
      return NextResponse.json(
        { error: 'Invalid training ID' },
        { status: 400 }
      );
    }

    // Ověř oprávnění
    let canCreate = false;

    if (isAdmin(session.user.role)) {
      canCreate = true;
    } else if (isTrainer(session.user.role)) {
      // Trainer může vytvářet testy pouze pro svá školení
      const assignment = await prisma.trainingAssignment.findFirst({
        where: {
          trainerId: parseInt(session.user.id),
          trainingId: trainingId
        }
      });
      canCreate = !!assignment;
    }

    if (!canCreate) {
      return NextResponse.json(
        { error: 'Nedostatečná oprávnění pro vytvoření testu' },
        { status: 403 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(request, CreateTestSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      title,
      description,
      passingScore,
      timeLimit,
      validFrom,
      validTo,
      questions
    } = validation.data;

    // Vytvoř test s otázkami v transakci
    const test = await prisma.$transaction(async (tx) => {
      // Vytvoř test
      const newTest = await tx.test.create({
        data: {
          trainingId,
          title,
          description,
          passingScore,
          timeLimit,
          validFrom: validFrom ? new Date(validFrom) : null,
          validTo: validTo ? new Date(validTo) : null,
          isActive: true
        }
      });

      // Vytvoř otázky (již validované v schema)
      if (questions && questions.length > 0) {
        await tx.question.createMany({
          data: questions.map((q, index: number) => ({
            testId: newTest.id,
            order: index,
            type: q.type,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer:
              typeof q.correctAnswer === 'string'
                ? q.correctAnswer
                : JSON.stringify(q.correctAnswer),
            points: q.points,
            required: q.required ?? true
          }))
        });
      }

      // Vrať test s otázkami
      return await tx.test.findUnique({
        where: { id: newTest.id },
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      test: test
    });
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json(
      { error: 'Failed to create test' },
      { status: 500 }
    );
  }
}
