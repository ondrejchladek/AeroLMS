import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isTrainer } from '@/types/roles';
import { prisma } from '@/lib/prisma';
import TestEditClient from './test-edit-client';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TestEditPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  // Allow both trainers and admins
  if (!isTrainer(session.user.role) && !isAdmin(session.user.role)) {
    redirect('/');
  }

  const { id } = await params;
  const testId = parseInt(id);

  if (isNaN(testId)) {
    redirect('/trainer');
  }

  // Get test with training info
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      training: {
        select: {
          id: true,
          code: true,
          name: true
        }
      },
      questions: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!test) {
    redirect('/trainer');
  }

  // Verify trainer has access to this test's training
  if (isTrainer(session.user.role) && !isAdmin(session.user.role)) {
    const assignment = await prisma.trainingAssignment.findFirst({
      where: {
        trainerId: parseInt(session.user.id),
        trainingId: test.trainingId
      }
    });

    if (!assignment) {
      redirect('/trainer');
    }
  }

  return <TestEditClient test={test} />;
}
