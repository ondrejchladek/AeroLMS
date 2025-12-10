import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { TrainingPDFDocument } from '@/components/training/training-pdf-document';
import { isTrainer } from '@/types/roles';
import { isTrainerAssignedToTraining } from '@/lib/authorization';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
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
        return new NextResponse('Nemáte oprávnění k tomuto školení', {
          status: 403
        });
      }
    }

    // Načti data školení z databáze (pouze ne-smazané)
    const training = await prisma.inspiritTraining.findFirst({
      where: { id: trainingId, deletedAt: null },
      select: {
        name: true,
        description: true,
        content: true
      }
    });

    if (!training) {
      return new NextResponse('Training not found', { status: 404 });
    }

    // Parse content z JSON stringu (může být Tiptap JSON nebo legacy sections)
    let parsedContent = null;
    if (training.content) {
      try {
        parsedContent = JSON.parse(training.content);
      } catch {
        // If not valid JSON, treat as plain text
        parsedContent = training.content;
      }
    }

    // Vygeneruj PDF
    const TrainingPDF = TrainingPDFDocument({
      training: {
        name: training.name,
        description: training.description,
        content: parsedContent
      },
      generatedDate: new Date()
    });

    const pdfBuffer = await renderToBuffer(TrainingPDF);

    // Vytvoř název souboru
    const fileName = `${training.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Vrať PDF jako response
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
