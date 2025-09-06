import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const test = await prisma.test.findFirst({
      where: { trainingId: parseInt(id) }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check if there's an unfinished attempt
    const existingAttempt = await prisma.testAttempt.findFirst({
      where: {
        testId: test.id,
        userId: parseInt(session.user.id),
        completedAt: null
      }
    });

    if (existingAttempt) {
      return NextResponse.json({
        attemptId: existingAttempt.id,
        message: 'Continuing existing test attempt'
      });
    }

    // Create new test attempt
    const newAttempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        userId: parseInt(session.user.id),
        employeeCode: parseInt(session.user.code),
        employeeName: session.user.name,
        startedAt: new Date()
      }
    });

    return NextResponse.json({
      attemptId: newAttempt.id,
      message: 'Test started successfully'
    });
  } catch (error) {
    console.error('Error starting test:', error);
    return NextResponse.json(
      { error: 'Failed to start test' },
      { status: 500 }
    );
  }
}
