import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const training = await prisma.training.findUnique({
      where: { id: parseInt(id) }
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: training.id,
      code: training.code,
      name: training.name,
      description: training.description,
      content: training.content ? JSON.parse(training.content) : null,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt
    });
  } catch (error) {
    console.error('Error fetching training content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training content' },
      { status: 500 }
    );
  }
}
