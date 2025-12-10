import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isTrainer } from '@/types/roles';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * Zod schema for assignment creation
 * Validates trainerId and trainingId are positive integers
 */
const AssignmentSchema = z.object({
  trainerId: z.number().int().positive('trainerId must be a positive integer'),
  trainingId: z.number().int().positive('trainingId must be a positive integer'),
});

// GET all training assignments
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const assignments = await prisma.inspiritTrainingAssignment.findMany({
      where: {
        deletedAt: null // Exclude soft-deleted assignments
      },
      include: {
        trainer: {
          select: {
            id: true,
            cislo: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        training: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true
          }
        }
      }
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST create new assignment
// BUSINESS RULE: One training can have only ONE trainer (1:1 relationship)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Validate request body with Zod schema
    const body = await request.json();
    const validation = AssignmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { trainerId, trainingId } = validation.data;

    // Verify trainer exists and has TRAINER role
    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: 'Uživatel nebyl nalezen' },
        { status: 404 }
      );
    }

    if (!isTrainer(trainer.role)) {
      return NextResponse.json(
        {
          error: `Uživatel ${trainer.firstName} ${trainer.lastName} nemá roli TRAINER. Lze přiřadit pouze uživatele s rolí TRAINER.`,
        },
        { status: 400 }
      );
    }

    // Verify training exists and is not soft-deleted
    const training = await prisma.inspiritTraining.findFirst({
      where: { id: trainingId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Školení nebylo nalezeno nebo bylo smazáno' },
        { status: 404 }
      );
    }

    // BUSINESS RULE: Check if training already has an active trainer assigned
    // One training = one trainer (enterprise requirement)
    const existingTrainerAssignment =
      await prisma.inspiritTrainingAssignment.findFirst({
        where: {
          trainingId,
          deletedAt: null // Only active assignments
        },
        include: {
          trainer: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

    if (existingTrainerAssignment) {
      // Training already has a trainer - return conflict error
      const trainerName = `${existingTrainerAssignment.trainer.firstName} ${existingTrainerAssignment.trainer.lastName}`;
      return NextResponse.json(
        {
          error: `Školení již má přiřazeného školitele: ${trainerName}. Jedno školení může mít pouze jednoho školitele.`,
          existingTrainerId: existingTrainerAssignment.trainerId,
          existingTrainerName: trainerName
        },
        { status: 409 }
      );
    }

    // Check if this specific trainer-training combination exists (including soft-deleted)
    const existingSameAssignment =
      await prisma.inspiritTrainingAssignment.findFirst({
        where: {
          trainerId,
          trainingId
        }
      });

    if (existingSameAssignment) {
      // If soft-deleted, restore it instead of creating new
      if (existingSameAssignment.deletedAt !== null) {
        const restored = await prisma.inspiritTrainingAssignment.update({
          where: { id: existingSameAssignment.id },
          data: { deletedAt: null },
          include: {
            trainer: {
              select: {
                id: true,
                cislo: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            training: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true
              }
            }
          }
        });

        // REAL-TIME UPDATE: Revalidate trainer pages
        revalidatePath('/trainer', 'layout');
        revalidatePath('/admin/assignments');

        return NextResponse.json({ assignment: restored, restored: true });
      }

      return NextResponse.json(
        { error: 'Toto přiřazení již existuje' },
        { status: 409 }
      );
    }

    const assignment = await prisma.inspiritTrainingAssignment.create({
      data: {
        trainerId,
        trainingId
      },
      include: {
        trainer: {
          select: {
            id: true,
            cislo: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        training: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true
          }
        }
      }
    });

    // REAL-TIME UPDATE: Revalidate trainer pages to show new assignment immediately
    // This ensures trainers see newly assigned trainings without manual refresh
    revalidatePath('/trainer', 'layout'); // Revalidates all /trainer/* pages including dashboard, prvni-testy, vysledky
    revalidatePath('/admin/assignments'); // Revalidate admin assignments page

    return NextResponse.json({ assignment });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}

// DELETE remove assignment
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('id');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    // Soft delete instead of hard delete
    await prisma.inspiritTrainingAssignment.update({
      where: {
        id: parseInt(assignmentId)
      },
      data: {
        deletedAt: new Date()
      }
    });

    // REAL-TIME UPDATE: Revalidate trainer pages to remove deleted assignment immediately
    // This ensures trainers no longer see unassigned trainings without manual refresh
    revalidatePath('/trainer', 'layout'); // Revalidates all /trainer/* pages including dashboard, prvni-testy, vysledky
    revalidatePath('/admin/assignments'); // Revalidate admin assignments page

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
