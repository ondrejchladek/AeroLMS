import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer } from '@/types/roles';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Získat detail testu
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Neautorizovaný přístup' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const testId = parseInt(id);

    if (isNaN(testId)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        training: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test nenalezen' }, { status: 404 });
    }

    // Transform questions
    const transformedTest = {
      ...test,
      questions: test.questions.map((q: any) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null
      }))
    };

    return NextResponse.json(transformedTest);
  } catch (error) {
    console.error('Get test error:', error);
    return NextResponse.json(
      { error: 'Chyba při načítání testu' },
      { status: 500 }
    );
  }
}

// PUT - Editace testu (pouze pro trainers a admins)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Neautorizovaný přístup' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const testId = parseInt(id);

    if (isNaN(testId)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    // Získej test s informací o školení
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        training: true
      }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test nenalezen' }, { status: 404 });
    }

    // Ověř oprávnění
    let canEdit = false;

    if (isAdmin(session.user.role)) {
      // Admin může editovat všechny testy
      canEdit = true;
    } else if (isTrainer(session.user.role)) {
      // Trainer může editovat testy svých školení
      const assignment = await prisma.trainingAssignment.findFirst({
        where: {
          trainerId: parseInt(session.user.id),
          trainingId: test.trainingId
        }
      });
      canEdit = !!assignment;
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Nedostatečná oprávnění pro editaci tohoto testu' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, passingScore, timeLimit, isActive, questions } =
      body;

    // Aktualizuj test a otázky v transakci
    const updatedTest = await prisma.$transaction(async (tx) => {
      // Aktualizuj test
      const updated = await tx.test.update({
        where: { id: testId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(passingScore !== undefined && { passingScore }),
          ...(timeLimit !== undefined && { timeLimit }),
          ...(isActive !== undefined && { isActive })
        }
      });

      // Pokud jsou dodány nové otázky, nahraď je
      if (questions && Array.isArray(questions)) {
        // Smaž staré otázky
        await tx.question.deleteMany({
          where: { testId: testId }
        });

        // Vytvoř nové otázky
        if (questions.length > 0) {
          await tx.question.createMany({
            data: questions.map((q: any, index: number) => ({
              testId: testId,
              order: q.order !== undefined ? q.order : index,
              type: q.type || 'single',
              question: q.question,
              options:
                typeof q.options === 'string'
                  ? q.options
                  : JSON.stringify(q.options),
              correctAnswer: q.correctAnswer || '',
              points: q.points || 1,
              required: q.required !== false
            }))
          });
        }
      }

      // Vrať aktualizovaný test s otázkami
      return await tx.test.findUnique({
        where: { id: testId },
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      test: updatedTest
    });
  } catch (error) {
    console.error('Update test error:', error);
    return NextResponse.json(
      { error: 'Chyba při aktualizaci testu' },
      { status: 500 }
    );
  }
}

// DELETE - Smazání testu (pouze admin nebo přiřazený trainer)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Neautorizovaný přístup' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const testId = parseInt(id);

    if (isNaN(testId)) {
      return NextResponse.json({ error: 'Invalid test ID' }, { status: 400 });
    }

    // Získej test s informací o školení
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        training: true
      }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test nenalezen' }, { status: 404 });
    }

    // Ověř oprávnění
    let canDelete = false;

    if (isAdmin(session.user.role)) {
      // Admin může mazat všechny testy
      canDelete = true;
    } else if (isTrainer(session.user.role)) {
      // Trainer může mazat testy svých školení
      const assignment = await prisma.trainingAssignment.findFirst({
        where: {
          trainerId: parseInt(session.user.id),
          trainingId: test.trainingId
        }
      });
      canDelete = !!assignment;
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Nedostatečná oprávnění pro smazání tohoto testu' },
        { status: 403 }
      );
    }

    // Smaž test (cascade delete smaže i otázky a pokusy)
    await prisma.test.delete({
      where: { id: testId }
    });

    return NextResponse.json({
      success: true,
      message: 'Test byl smazán'
    });
  } catch (error) {
    console.error('Delete test error:', error);
    return NextResponse.json(
      { error: 'Chyba při mazání testu' },
      { status: 500 }
    );
  }
}
