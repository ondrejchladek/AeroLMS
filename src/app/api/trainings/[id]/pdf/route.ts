import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { TrainingPDFDocument } from '@/components/training/training-pdf-document';
import { getFullNameSafe } from '@/lib/user-helpers';

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

    // Načti data školení z databáze
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      select: {
        name: true,
        description: true,
        content: true
      }
    });

    if (!training) {
      return new NextResponse('Training not found', { status: 404 });
    }

    // Získej jméno uživatele ze session
    const userName = getFullNameSafe(
      {
        firstName: session.user.firstName,
        lastName: session.user.lastName
      },
      'Uživatel'
    );

    // Parse content z JSON stringu
    const parsedContent = training.content
      ? JSON.parse(training.content)
      : null;

    // Vygeneruj PDF
    const TrainingPDF = TrainingPDFDocument({
      training: {
        name: training.name,
        description: training.description,
        content: parsedContent
      },
      userName,
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
