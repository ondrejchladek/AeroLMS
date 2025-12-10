import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { isAdmin, isTrainer } from '@/types/roles';
import {
  UpdateTrainingSchema,
  validateRequestBody
} from '@/lib/validation-schemas';
import {
  isTrainerAssignedToTraining,
  validateTrainingAccess
} from '@/lib/authorization';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Získat detail školení
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    // SECURITY: Require authentication
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Neautorizovaný přístup' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const trainingId = parseInt(id);

    if (isNaN(trainingId)) {
      return NextResponse.json(
        { error: 'Invalid training ID' },
        { status: 400 }
      );
    }

    // SECURITY: Validate trainer has access to this training
    if (isTrainer(session.user.role)) {
      const hasAccess = await isTrainerAssignedToTraining(
        parseInt(session.user.id),
        trainingId
      );
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Nemáte oprávnění k tomuto školení' },
          { status: 403 }
        );
      }
    }

    const training = await prisma.inspiritTraining.findFirst({
      where: { id: trainingId, deletedAt: null },
      include: {
        tests: {
          where: { deletedAt: null }, // Exclude soft-deleted tests
          select: {
            id: true,
            title: true,
            description: true,
            isActive: true,
            passingScore: true,
            timeLimit: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        // BUSINESS RULE: One training = one trainer
        // Get the single active assignment (should be max 1 due to business rule)
        trainingAssignments: {
          where: { deletedAt: null },
          include: {
            trainer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                cislo: true
              }
            }
          },
          take: 1 // Enforce single trainer at query level
        }
      }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Školení nenalezeno' },
        { status: 404 }
      );
    }

    // Transform response to include single trainer instead of array
    const { trainingAssignments, ...trainingData } = training;
    const assignment = trainingAssignments[0] || null;

    return NextResponse.json({
      ...trainingData,
      // Single trainer object (or null if not assigned)
      trainer: assignment
        ? {
            id: assignment.trainer.id,
            firstName: assignment.trainer.firstName,
            lastName: assignment.trainer.lastName,
            email: assignment.trainer.email,
            cislo: assignment.trainer.cislo
          }
        : null,
      // Keep trainingAssignments for backwards compatibility during transition
      trainingAssignments
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Chyba při načítání školení' },
      { status: 500 }
    );
  }
}

// PUT - Editace školení (pouze pro trainers a admins)
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
    const trainingId = parseInt(id);

    if (isNaN(trainingId)) {
      return NextResponse.json(
        { error: 'Invalid training ID' },
        { status: 400 }
      );
    }

    // SECURITY: Validate trainer has access using centralized helper
    try {
      await validateTrainingAccess(session, trainingId);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Nedostatečná oprávnění' },
        { status: 403 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(request, UpdateTrainingSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, description, content } = validation.data;

    // Připrav data pro aktualizaci (již validované)
    const updateData: Record<string, any> = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (content !== undefined) {
      // Content je uložen jako JSON string
      updateData.content =
        typeof content === 'string' ? content : JSON.stringify(content);
    }

    // Aktualizuj školení
    const updatedTraining = await prisma.inspiritTraining.update({
      where: { id: trainingId },
      data: updateData,
      include: {
        tests: {
          where: { deletedAt: null }, // Only active tests
          select: {
            id: true,
            title: true,
            isActive: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      training: updatedTraining
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Chyba při aktualizaci školení' },
      { status: 500 }
    );
  }
}

/**
 * Cascade soft-delete all related entities when a training is soft-deleted
 * Sets deletedAt timestamp on: tests, questions, test attempts, certificates, assignments
 * CRITICAL: Must be called within a transaction context for atomicity
 */
async function softDeleteTrainingCascade(
  trainingId: number,
  tx: Prisma.TransactionClient
): Promise<void> {
  const now = new Date();

  // Get all tests for this training
  const tests = await tx.inspiritTest.findMany({
    where: { trainingId, deletedAt: null },
    select: { id: true }
  });
  const testIds = tests.map((t) => t.id);

  if (testIds.length > 0) {
    // Soft-delete questions
    await tx.inspiritQuestion.updateMany({
      where: { testId: { in: testIds }, deletedAt: null },
      data: { deletedAt: now }
    });

    // Soft-delete test attempts
    await tx.inspiritTestAttempt.updateMany({
      where: { testId: { in: testIds }, deletedAt: null },
      data: { deletedAt: now }
    });

    // Get attempt IDs for certificates
    const attempts = await tx.inspiritTestAttempt.findMany({
      where: { testId: { in: testIds } },
      select: { id: true }
    });
    const attemptIds = attempts.map((a) => a.id);

    // Soft-delete certificates
    if (attemptIds.length > 0) {
      await tx.inspiritCertificate.updateMany({
        where: { testAttemptId: { in: attemptIds }, deletedAt: null },
        data: { deletedAt: now }
      });
    }

    // Soft-delete tests
    await tx.inspiritTest.updateMany({
      where: { id: { in: testIds }, deletedAt: null },
      data: { deletedAt: now }
    });
  }

  // Soft-delete training assignments
  await tx.inspiritTrainingAssignment.updateMany({
    where: { trainingId, deletedAt: null },
    data: { deletedAt: now }
  });
}

// DELETE - Smazání školení (pouze admin)
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

    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Pouze admin může mazat školení' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const trainingId = parseInt(id);

    if (isNaN(trainingId)) {
      return NextResponse.json(
        { error: 'Invalid training ID' },
        { status: 400 }
      );
    }

    // Check if training exists and is not already deleted
    const training = await prisma.inspiritTraining.findUnique({
      where: { id: trainingId }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Školení nenalezeno' },
        { status: 404 }
      );
    }

    if (training.deletedAt) {
      return NextResponse.json(
        { error: 'Školení již bylo smazáno' },
        { status: 400 }
      );
    }

    // SOFT DELETE: Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Soft-delete the training
      await tx.inspiritTraining.update({
        where: { id: trainingId },
        data: { deletedAt: new Date() }
      });

      // Cascade soft-delete to all related entities
      await softDeleteTrainingCascade(trainingId, tx);
    });

    return NextResponse.json({
      success: true,
      message: 'Školení bylo smazáno'
    });
  } catch (error) {
    console.error('[DELETE /api/trainings/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Chyba při mazání školení' },
      { status: 500 }
    );
  }
}
