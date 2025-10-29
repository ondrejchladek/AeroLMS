import { NextResponse } from 'next/server';
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

    const assignments = await prisma.trainingAssignment.findMany({
      include: {
        trainer: {
          select: {
            id: true,
            code: true,
            name: true,
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
    console.error('Error fetching assignments:', error);
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

    // Check if assignment already exists
    const existing = await prisma.trainingAssignment.findFirst({
      where: {
        trainerId,
        trainingId
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Assignment already exists' },
        { status: 409 }
      );
    }

    const assignment = await prisma.trainingAssignment.create({
      data: {
        trainerId,
        trainingId
      },
      include: {
        trainer: {
          select: {
            id: true,
            code: true,
            name: true,
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

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error creating assignment:', error);
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

    await prisma.trainingAssignment.delete({
      where: {
        id: parseInt(assignmentId)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
