import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/deleted-data/restore
 * Restore a soft-deleted training with cascade restore
 * Admin only
 *
 * Body: { trainingId: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { trainingId } = body;

    if (!trainingId || typeof trainingId !== 'number') {
      return NextResponse.json(
        { error: 'Chybí nebo neplatné trainingId' },
        { status: 400 }
      );
    }

    // Check if training exists and is soft-deleted
    const training = await prisma.inspiritTraining.findUnique({
      where: { id: trainingId },
      select: { id: true, code: true, name: true, deletedAt: true }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Školení nenalezeno' },
        { status: 404 }
      );
    }

    if (!training.deletedAt) {
      return NextResponse.json(
        { error: 'Školení není smazané' },
        { status: 400 }
      );
    }

    // Restore training
    await prisma.inspiritTraining.update({
      where: { id: trainingId },
      data: { deletedAt: null }
    });

    // Cascade restore all related entities
    await restoreTrainingCascade(trainingId);

    return NextResponse.json({
      success: true,
      message: `Školení ${training.code} (${training.name}) bylo obnoveno`,
      training: {
        id: training.id,
        code: training.code,
        name: training.name
      }
    });
  } catch (error) {
    console.error('[POST /api/admin/deleted-data/restore] Error:', error);
    return NextResponse.json(
      { error: 'Chyba při obnovování školení' },
      { status: 500 }
    );
  }
}

/**
 * Cascade restore all related entities when a training is restored
 * Sets deletedAt = NULL on: tests, questions, test attempts, certificates, assignments
 */
async function restoreTrainingCascade(trainingId: number): Promise<void> {
  try {
    // Get all tests for this training (including soft-deleted)
    const tests = await prisma.inspiritTest.findMany({
      where: { trainingId },
      select: { id: true }
    });
    const testIds = tests.map((t) => t.id);

    if (testIds.length > 0) {
      // Restore tests
      await prisma.inspiritTest.updateMany({
        where: { id: { in: testIds } },
        data: { deletedAt: null }
      });

      // Restore questions
      await prisma.inspiritQuestion.updateMany({
        where: { testId: { in: testIds } },
        data: { deletedAt: null }
      });

      // Restore test attempts
      await prisma.inspiritTestAttempt.updateMany({
        where: { testId: { in: testIds } },
        data: { deletedAt: null }
      });
    }

    // Restore certificates
    await prisma.inspiritCertificate.updateMany({
      where: { trainingId },
      data: { deletedAt: null }
    });

    // Restore training assignments
    await prisma.inspiritTrainingAssignment.updateMany({
      where: { trainingId },
      data: { deletedAt: null }
    });

    console.log(`[restoreCascade] Restored all entities for training ${trainingId}`);
  } catch (error) {
    console.error(`[restoreCascade] Error for training ${trainingId}:`, error);
    throw error;
  }
}
