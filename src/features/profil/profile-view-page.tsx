// src/features/profil/components/profile-view-page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function ProfileViewPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <div className='flex w-full flex-col space-y-4 p-4'>
      <h1 className='text-2xl font-semibold'>Profil uživatele</h1>

      {user ? (
        <div className='space-y-1'>
          <p>
            <span className='font-medium'>Jméno:</span> {user.name}
          </p>
          <p>
            <span className='font-medium'>Kód zaměstnance:</span> {user.code}
          </p>
        </div>
      ) : (
        <p className='text-muted-foreground'>Session not found.</p>
      )}
    </div>
  );
}
