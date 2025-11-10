import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    const training = await prisma.inspiritTraining.findUnique({
      where: { id: trainingId },
      include: {
        tests: {
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
        trainingAssignments: {
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
          }
        }
      }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Školení nenalezeno' },
        { status: 404 }
      );
    }

    return NextResponse.json(training);
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

// DELETE - Smazání školení (pouze admin)
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

    // Smaž školení (cascade delete smaže i související záznamy)
    await prisma.inspiritTraining.delete({
      where: { id: trainingId }
    });

    return NextResponse.json({
      success: true,
      message: 'Školení bylo smazáno'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Chyba při mazání školení' },
      { status: 500 }
    );
  }
}
