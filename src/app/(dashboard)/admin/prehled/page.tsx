import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/types/roles';
import AdminPrehledClient from './admin-prehled-client';

export default async function AdminPrehledPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  if (!isAdmin(session.user.role)) {
    redirect('/');
  }

  return <AdminPrehledClient />;
}