import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isTrainer } from '@/types/roles';
import { prisma } from '@/lib/prisma';
import TrainerDashboard from './trainer-dashboard';

export default async function TrainerPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  // Allow both trainers and admins
  if (!isTrainer(session.user.role) && !isAdmin(session.user.role)) {
    redirect('/');
  }

  // Get trainer's assigned trainings
  const assignments = await prisma.inspiritTrainingAssignment.findMany({
    where: {
      trainerId: parseInt(session.user.id)
    },
    include: {
      training: {
        include: {
          tests: {
            select: {
              id: true,
              title: true,
              isActive: true
            }
          }
        }
      }
    }
  });

  return <TrainerDashboard assignments={assignments} />;
}
