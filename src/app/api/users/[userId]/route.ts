import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/types/roles';
import { validateTrainingCode } from '@/lib/validation-schemas';

interface Props {
  params: Promise<{
    userId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    // Ověření přihlášení a admin práv
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kontrola admin práv pomocí role
    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.userId);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Získat data z požadavku
    const data = await request.json();

    // Rozdělit data na auth fields (email, role) a training columns
    const authFields: Record<string, any> = {};
    const trainingColumns: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // DatumPristi fields are computed by database, skip them
      if (key.includes('DatumPristi')) {
        continue;
      }

      // Skip computed name field
      if (key === 'name') {
        continue;
      }

      // Auth fields (email, role) go to InspiritCisZam VIEW → INSTEAD OF trigger → InspiritUserAuth
      if (key === 'email' || key === 'role') {
        authFields[key] = value;
      }
      // Training columns (_*Pozadovano, _*DatumPosl) go to TabCisZam_EXT directly
      else if (key.startsWith('_')) {
        // SECURITY: Validate training column name to prevent SQL injection
        // Extract training code from column name (e.g., _CMMPozadovano → CMM)
        const match = key.match(/^_([A-Za-z0-9]+)(Pozadovano|DatumPosl)$/);
        if (!match) {
          console.warn(`Invalid training column name: ${key}`);
          continue; // Skip invalid column names
        }

        const trainingCode = match[1];
        try {
          validateTrainingCode(trainingCode); // Throws if invalid pattern
        } catch {
          console.warn(`Invalid training code in column: ${key}`);
          continue; // Skip columns with invalid training codes
        }

        let processedValue = value;
        if (key.includes('Datum') && value) {
          processedValue = new Date(value as string);
        }
        trainingColumns[key] = processedValue;
      }
    }

    // Update auth fields via VIEW (INSTEAD OF trigger handles routing)
    // Using Prisma ORM - cleaner and type-safe, still triggers INSTEAD OF trigger
    if (Object.keys(authFields).length > 0) {
      await prisma.inspiritCisZam.update({
        where: { id: userId },
        data: authFields
      });
    }

    // Update training columns directly in TabCisZam_EXT
    if (Object.keys(trainingColumns).length > 0) {
      const updateColumns: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(trainingColumns)) {
        updateColumns.push(`[${key}] = @P${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      const sql = `
        UPDATE TabCisZam_EXT
        SET ${updateColumns.join(', ')}
        WHERE ID = @P${paramIndex}
      `;
      values.push(userId);

      await prisma.$executeRawUnsafe(sql, ...values);
    }

    if (Object.keys(authFields).length === 0 && Object.keys(trainingColumns).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Uživatel úspěšně aktualizován'
    });
  } catch (error) {
    console.error('PATCH /api/users/[userId] error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    if (
      error instanceof Error &&
      error.message.includes('Record to update not found')
    ) {
      return NextResponse.json(
        { error: 'Uživatel nenalezen' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
