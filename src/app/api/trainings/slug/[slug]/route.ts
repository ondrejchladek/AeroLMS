import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special chars with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    // First try to find by direct code match
    const trainingByCode = await prisma.inspiritTraining.findUnique({
      where: { code: slug.toUpperCase() },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      }
    });

    if (trainingByCode) {
      return NextResponse.json(trainingByCode);
    }

    // If not found by code, load all trainings and compare slugs
    const allTrainings = await prisma.inspiritTraining.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      }
    });

    // Find training whose slug matches the URL
    for (const training of allTrainings) {
      const trainingSlug = slugify(training.name);
      if (trainingSlug === slug || training.code.toLowerCase() === slug) {
        return NextResponse.json(training);
      }
    }

    // Training not found - all trainings are dynamic, no hardcoded mappings
    return NextResponse.json({ error: 'Training not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
