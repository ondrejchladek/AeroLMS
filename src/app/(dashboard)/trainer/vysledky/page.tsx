import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isAdmin, isTrainer } from '@/types/roles';
import { ResultsClient } from './results-client';

export default async function ResultsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Only trainers and admins can access this page
  if (!isAdmin(session.user.role) && !isTrainer(session.user.role)) {
    redirect('/');
  }

  return <ResultsClient />;
}