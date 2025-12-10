import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isTrainer } from '@/types/roles';
import { isTrainerAssignedToTraining } from '@/lib/authorization';

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
    const trainingId = parseInt(id);

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
      where: { id: trainingId, deletedAt: null }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: training.id,
      code: training.code,
      name: training.name,
      description: training.description,
      content: training.content ? JSON.parse(training.content) : null,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch training content' },
      { status: 500 }
    );
  }
}
