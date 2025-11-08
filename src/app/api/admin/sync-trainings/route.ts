import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncTrainingsWithDatabase } from '@/lib/training-sync';
import { isAdmin } from '@/types/roles';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Run training synchronization
    const result = await syncTrainingsWithDatabase();

    return NextResponse.json({
      success: true,
      message: 'Training synchronization completed',
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to synchronize trainings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed - Use POST' },
    { status: 405 }
  );
}
