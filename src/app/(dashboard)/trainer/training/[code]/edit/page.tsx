import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isTrainer } from '@/types/roles';
import { prisma } from '@/lib/prisma';
import TrainingEditClient from './training-edit-client';

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function TrainingEditPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  // Allow both trainers and admins
  if (!isTrainer(session.user.role) && !isAdmin(session.user.role)) {
    redirect('/');
  }

  const { code } = await params;

  // Get training by code
  const training = await prisma.inspiritTraining.findFirst({
    where: { code: code, deletedAt: null }
  });

  if (!training) {
    redirect('/trainer');
  }

  // Verify trainer has access and get assignment with PDF info
  const assignment = await prisma.inspiritTrainingAssignment.findFirst({
    where: {
      trainerId: parseInt(session.user.id),
      trainingId: training.id,
      deletedAt: null // Exclude soft-deleted assignments
    },
    select: {
      id: true,
      pdfFileName: true,
      pdfOriginalName: true,
      pdfFileSize: true,
      pdfMimeType: true,
      pdfUploadedAt: true,
      pdfUploadedBy: true
    }
  });

  // Non-admin trainers must have an assignment
  if (isTrainer(session.user.role) && !isAdmin(session.user.role) && !assignment) {
    redirect('/trainer');
  }

  // Prepare PDF info for client (convert BigInt to number)
  const pdfInfo = assignment
    ? {
        pdfFileName: assignment.pdfFileName,
        pdfOriginalName: assignment.pdfOriginalName,
        pdfFileSize: assignment.pdfFileSize ? Number(assignment.pdfFileSize) : null,
        pdfUploadedAt: assignment.pdfUploadedAt?.toISOString() || null,
        pdfUploadedBy: assignment.pdfUploadedBy
      }
    : null;

  return (
    <TrainingEditClient
      training={training}
      pdfInfo={pdfInfo}
    />
  );
}
