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
    const trainingId = parseInt(id);

    // Get testId from request body
    const body = await request.json();
    const { testId } = body;

    if (!testId) {
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    // Verify test exists and belongs to this training
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        trainingId: trainingId,
        isActive: true // Only allow starting active tests
      }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found or not active' }, { status: 404 });
    }

    // Check if there's an unfinished attempt for this specific test
    const existingAttempt = await prisma.testAttempt.findFirst({
      where: {
        testId: testId,
        userId: parseInt(session.user.id),
        completedAt: null
      }
    });

    if (existingAttempt) {
      return NextResponse.json({
        attemptId: existingAttempt.id,
        testId: testId,
        message: 'Continuing existing test attempt'
      });
    }

    // Create new test attempt
    const newAttempt = await prisma.testAttempt.create({
      data: {
        testId: testId,
        userId: parseInt(session.user.id),
        employeeCode: session.user.code || null,
        employeeName: session.user.name,
        startedAt: new Date()
      }
    });

    return NextResponse.json({
      attemptId: newAttempt.id,
      testId: testId,
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