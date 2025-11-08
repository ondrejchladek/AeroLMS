import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    const training = await prisma.inspiritTraining.findUnique({
      where: { code },
      include: {
        tests: true
      }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }

    // Check if user has completed this training
    const lastAttempt = await prisma.inspiritTestAttempt.findFirst({
      where: {
        userId: parseInt(session.user.id),
        test: {
          trainingId: training.id
        },
        passed: true
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    return NextResponse.json({
      id: training.id,
      code: training.code,
      name: training.name,
      description: training.description,
      content: training.content ? JSON.parse(training.content) : null,
      hasTest: training.tests.length > 0,
      testId: training.tests[0]?.id,
      lastCompletedAt: lastAttempt?.completedAt,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch training' },
      { status: 500 }
    );
  }
}
