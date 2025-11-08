import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isTrainer } from '@/types/roles';
import { prisma } from '@/lib/prisma';
import TestsManagementClient from './tests-management-client';

interface PageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function TestsManagementPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  // Allow both trainers and admins
  if (!isTrainer(session.user.role) && !isAdmin(session.user.role)) {
    redirect('/');
  }

  const { code } = await params;

  // Get training with tests
  const training = await prisma.inspiritTraining.findUnique({
    where: { code: code },
    include: {
      tests: {
        include: {
          _count: {
            select: {
              questions: true,
              testAttempts: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
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

  return <TestsManagementClient training={training} />;
}
