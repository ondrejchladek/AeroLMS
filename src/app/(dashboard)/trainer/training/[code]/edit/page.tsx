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
  const training = await prisma.inspiritTraining.findUnique({
    where: { code: code }
  });

  if (!training) {
    redirect('/trainer');
  }

  // Verify trainer has access to this training
  if (isTrainer(session.user.role) && !isAdmin(session.user.role)) {
    const assignment = await prisma.inspiritTrainingAssignment.findFirst({
      where: {
        trainerId: parseInt(session.user.id),
        trainingId: training.id
      }
    });

    if (!assignment) {
      redirect('/trainer');
    }
  }

  return <TrainingEditClient training={training} />;
}
