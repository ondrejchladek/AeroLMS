import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/types/roles';
import PageContainer from '@/components/layout/page-container';
import { SyncClient } from './sync-client';

export default async function SynchronizacePage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  if (!isAdmin(session.user.role)) {
    redirect('/');
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Synchronizace školení</h1>
        <p className="text-muted-foreground">
          Správa synchronizace školení mezi databázovými sloupci a systémem školení
        </p>
        <SyncClient />
      </div>
    </PageContainer>
  );
}