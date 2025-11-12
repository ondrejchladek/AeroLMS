import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/types/roles';
import { prisma } from '@/lib/prisma';

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

    const { trainerId, trainingId } = await request.json();

    if (!trainerId || !trainingId) {
      return NextResponse.json(
        { error: 'trainerId and trainingId are required' },
        { status: 400 }
      );
    }

    // Check if assignment already exists (including soft-deleted)
    const existing = await prisma.inspiritTrainingAssignment.findFirst({
      where: {
        trainerId,
        trainingId
      }
    });

    if (existing) {
      // If soft-deleted, restore it instead of creating new
      if (existing.deletedAt !== null) {
        const restored = await prisma.inspiritTrainingAssignment.update({
          where: { id: existing.id },
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
        { error: 'Assignment already exists' },
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
