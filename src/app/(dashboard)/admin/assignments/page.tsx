import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/types/roles';
import { prisma } from '@/lib/prisma';
import AssignmentsClient from './assignments-client';

export default async function AssignmentsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  if (!isAdmin(session.user.role)) {
    redirect('/');
  }

  // Get all trainers and trainings for the assignment page
  const [trainers, trainings, assignments] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: 'TRAINER'
      },
      select: {
        id: true,
        cislo: true,
        firstName: true,
        lastName: true,
        email: true
      }
    }),
    prisma.inspiritTraining.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        description: true
      }
    }),
    prisma.inspiritTrainingAssignment.findMany({
      include: {
        trainer: {
          select: {
            id: true,
            cislo: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        training: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    })
  ]);

  // Convert Date objects to strings for client component
  const formattedAssignments = assignments.map((assignment) => ({
    ...assignment,
    assignedAt: assignment.assignedAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString()
  }));

  return (
    <AssignmentsClient
      trainers={trainers}
      trainings={trainings}
      initialAssignments={formattedAssignments}
    />
  );
}
