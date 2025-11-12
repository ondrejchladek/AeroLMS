import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer } from '@/types/roles';
import { validateTestAccess } from '@/lib/authorization';

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

    // SECURITY: Validate trainer has access to this test
    try {
      await validateTestAccess(session, testId);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Nedostatečná oprávnění' },
        { status: 403 }
      );
    }

    const test = await prisma.inspiritTest.findFirst({
      where: {
        id: testId,
        deletedAt: null // Only active tests
      },
      include: {
        questions: {
          where: { deletedAt: null }, // Only active questions
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

    // SECURITY: Validate trainer has access using centralized helper
    try {
      await validateTestAccess(session, testId);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Nedostatečná oprávnění' },
        { status: 403 }
      );
    }

    // Získej test pro validaci existence (pouze aktivní)
    const test = await prisma.inspiritTest.findFirst({
      where: {
        id: testId,
        deletedAt: null // Only active tests can be edited
      }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test nenalezen nebo byl smazán' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, passingScore, timeLimit, isActive, questions } =
      body;

    // Aktualizuj test a otázky v transakci
    const updatedTest = await prisma.$transaction(async (tx) => {
      // BUSINESS RULE: Only one active test per training
      // When activating a test, deactivate all other tests for the same training
      if (isActive === true) {
        await tx.inspiritTest.updateMany({
          where: {
            trainingId: test.trainingId,
            id: { not: testId },
            deletedAt: null
          },
          data: { isActive: false }
        });
      }

      // Aktualizuj test
      await tx.inspiritTest.update({
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
        await tx.inspiritQuestion.deleteMany({
          where: { testId: testId }
        });

        // Vytvoř nové otázky
        if (questions.length > 0) {
          await tx.inspiritQuestion.createMany({
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
      return await tx.inspiritTest.findUnique({
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
    return NextResponse.json(
      { error: 'Chyba při aktualizaci testu' },
      { status: 500 }
    );
  }
}

/**
 * Cascade soft-delete all related entities when a test is soft-deleted
 * Sets deletedAt timestamp on: questions, test attempts, certificates
 * @param testId - ID of test to soft-delete
 */
async function softDeleteTestCascade(testId: number): Promise<void> {
  try {
    const now = new Date();

    // Soft-delete questions
    await prisma.inspiritQuestion.updateMany({
      where: { testId, deletedAt: null },
      data: { deletedAt: now }
    });

    // Soft-delete test attempts
    await prisma.inspiritTestAttempt.updateMany({
      where: { testId, deletedAt: null },
      data: { deletedAt: now }
    });

    // Soft-delete certificates related to this test's attempts
    // Note: Certificates are legal documents, so they're preserved even when soft-deleted
    const testAttempts = await prisma.inspiritTestAttempt.findMany({
      where: { testId },
      select: { id: true }
    });
    const attemptIds = testAttempts.map((a) => a.id);

    if (attemptIds.length > 0) {
      await prisma.inspiritCertificate.updateMany({
        where: { testAttemptId: { in: attemptIds }, deletedAt: null },
        data: { deletedAt: now }
      });
    }

    console.log(`[softDeleteTestCascade] Soft-deleted all entities for test ${testId}`);
  } catch (error) {
    console.error(`[softDeleteTestCascade] Error for test ${testId}:`, error);
    throw error;
  }
}

// DELETE - Smazání testu (pouze admin nebo přiřazený trainer)
// Uses SOFT DELETE to preserve data integrity and legal documents (certificates)
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

    // SECURITY: Validate trainer has access using centralized helper
    try {
      await validateTestAccess(session, testId);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Nedostatečná oprávnění' },
        { status: 403 }
      );
    }

    // Validuj existenci testu (včetně již soft-deleted)
    const test = await prisma.inspiritTest.findUnique({
      where: { id: testId }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test nenalezen' }, { status: 404 });
    }

    if (test.deletedAt) {
      return NextResponse.json(
        { error: 'Test již byl smazán' },
        { status: 400 }
      );
    }

    // SOFT DELETE: Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Soft-delete the test
      await tx.inspiritTest.update({
        where: { id: testId },
        data: { deletedAt: new Date() }
      });

      // Cascade soft-delete to all related entities
      await softDeleteTestCascade(testId);
    });

    return NextResponse.json({
      success: true,
      message: 'Test byl smazán'
    });
  } catch (error) {
    console.error('[DELETE /api/tests/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Chyba při mazání testu' },
      { status: 500 }
    );
  }
}
