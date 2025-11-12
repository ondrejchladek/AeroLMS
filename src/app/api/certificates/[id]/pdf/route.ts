import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { CertificatePDFDocument } from '@/components/training/certificate-pdf-document';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const certificateId = parseInt(id);

    // Fetch certificate with all related data
    const certificate = await prisma.inspiritCertificate.findUnique({
      where: { id: certificateId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            cislo: true
          }
        },
        training: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        testAttempt: {
          select: {
            id: true,
            score: true,
            passed: true,
            completedAt: true
          }
        }
      }
    });

    if (!certificate || certificate.deletedAt !== null) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    // SECURITY: Users can only download their own certificates
    // Admins and trainers can download any certificate
    if (
      session.user.role === 'WORKER' &&
      certificate.userId !== parseInt(session.user.id)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Generate PDF using React PDF
    const CertificatePDF = CertificatePDFDocument({
      certificate: {
        certificateNumber: certificate.certificateNumber,
        issuedAt: certificate.issuedAt.toISOString(),
        validUntil: certificate.validUntil.toISOString()
      },
      user: {
        firstName: certificate.user.firstName,
        lastName: certificate.user.lastName,
        cislo: certificate.user.cislo || 0
      },
      training: {
        code: certificate.training.code,
        name: certificate.training.name || `Školení ${certificate.training.code}`
      },
      testAttempt: {
        score: certificate.testAttempt.score || 0,
        completedAt: certificate.testAttempt.completedAt?.toISOString() || new Date().toISOString()
      }
    });

    const pdfBuffer = await renderToBuffer(CertificatePDF as any);

    // Return PDF with appropriate headers
    const fileName = `Certifikat_${certificate.certificateNumber}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    // Return detailed error in development for debugging
    return NextResponse.json(
      {
        error: 'Failed to generate certificate PDF',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
