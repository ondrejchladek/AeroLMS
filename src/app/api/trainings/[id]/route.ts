import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer } from '@/types/roles';
import {
  UpdateTrainingSchema,
  validateRequestBody
} from '@/lib/validation-schemas';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Získat detail školení
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const trainingId = parseInt(id);

    if (isNaN(trainingId)) {
      return NextResponse.json(
        { error: 'Invalid training ID' },
        { status: 400 }
      );
    }

    const training = await prisma.training.findUnique({
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

    // Ověř oprávnění
    let canEdit = false;

    if (isAdmin(session.user.role)) {
      // Admin může editovat všechna školení
      canEdit = true;
    } else if (isTrainer(session.user.role)) {
      // Trainer může editovat pouze přiřazená školení
      const assignment = await prisma.trainingAssignment.findFirst({
        where: {
          trainerId: parseInt(session.user.id),
          trainingId: trainingId
        }
      });
      canEdit = !!assignment;
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Nedostatečná oprávnění pro editaci tohoto školení' },
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
    const updatedTraining = await prisma.training.update({
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
    await prisma.training.delete({
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
