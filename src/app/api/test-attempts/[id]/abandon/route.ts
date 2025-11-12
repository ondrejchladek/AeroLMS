import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attemptId = parseInt(id);

    // Get test attempt
    const attempt = await prisma.inspiritTestAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) {
      return NextResponse.json(
        { error: 'Test attempt not found' },
        { status: 404 }
      );
    }

    // SECURITY: Only the user who started the attempt can abandon it
    if (attempt.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already completed
    if (attempt.completedAt) {
      return NextResponse.json(
        { error: 'Test already completed' },
        { status: 400 }
      );
    }

    // Mark as failed (abandoned)
    await prisma.inspiritTestAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score: 0,
        passed: false,
        answers: JSON.stringify({ abandoned: true })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test marked as abandoned'
    });
  } catch (error) {
    console.error('Error abandoning test:', error);
    return NextResponse.json(
      { error: 'Failed to abandon test' },
      { status: 500 }
    );
  }
}
