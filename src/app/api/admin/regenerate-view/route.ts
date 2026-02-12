import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/regenerate-view
 *
 * Regenerates the InspiritCisZam VIEW dynamically based on training columns
 * found in TabCisZam_EXT table.
 *
 * This allows admins to add new training columns without manually editing SQL files.
 *
 * ADMIN ONLY - requires admin role
 */
export async function POST() {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Pouze admin může regenerovat VIEW' },
        { status: 403 }
      );
    }

    // Check if stored procedure exists
    const procExists = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name FROM sys.procedures WHERE name = 'sp_RegenerateInspiritCisZamView'`
    );

    if (procExists.length === 0) {
      return NextResponse.json(
        {
          error: 'Stored procedure sp_RegenerateInspiritCisZamView neexistuje',
          details:
            'Nejprve spusťte deployment/sql/10_dynamic_view_regeneration.sql na databázi'
        },
        { status: 500 }
      );
    }

    // Execute the stored procedure
    await prisma.$executeRawUnsafe(`EXEC sp_RegenerateInspiritCisZamView @PreviewOnly = 0`);

    // Get list of detected trainings for response
    const trainings = await prisma.$queryRawUnsafe<
      Array<{ Code: string; ValidityMonths: number }>
    >(`
      SELECT
        SUBSTRING(c.COLUMN_NAME, 2, LEN(c.COLUMN_NAME) - 10) AS Code,
        ISNULL(t.validityMonths, 12) AS ValidityMonths
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN InspiritTraining t ON t.code = SUBSTRING(c.COLUMN_NAME, 2, LEN(c.COLUMN_NAME) - 10)
        AND t.deletedAt IS NULL
      WHERE c.TABLE_NAME = 'TabCisZam_EXT'
        AND c.TABLE_SCHEMA = 'dbo'
        AND c.COLUMN_NAME LIKE '[_]%DatumPosl'
        AND c.COLUMN_NAME NOT LIKE '[_]HeIQ%'
        AND EXISTS (
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c2
          WHERE c2.TABLE_NAME = 'TabCisZam_EXT'
            AND c2.COLUMN_NAME = '_' + SUBSTRING(c.COLUMN_NAME, 2, LEN(c.COLUMN_NAME) - 10) + 'Pozadovano'
        )
      ORDER BY Code
    `);

    return NextResponse.json({
      success: true,
      message: `VIEW InspiritCisZam byl úspěšně regenerován s ${trainings.length} školeními`,
      trainings: trainings.map((t) => ({
        code: t.Code,
        validityMonths: t.ValidityMonths
      }))
    });
  } catch (error) {
    console.error('[regenerate-view] Error:', error);
    return NextResponse.json(
      {
        error: 'Chyba při regeneraci VIEW',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/regenerate-view
 *
 * Preview mode - returns the SQL that would be generated without executing it.
 * Useful for reviewing changes before applying them.
 */
export async function GET() {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Pouze admin může zobrazit preview' },
        { status: 403 }
      );
    }

    // Get detected trainings
    const trainings = await prisma.$queryRawUnsafe<
      Array<{
        Code: string;
        HasDatumPosl: boolean;
        HasPozadovano: boolean;
        ValidityMonths: number;
      }>
    >(`
      SELECT
        SUBSTRING(c.COLUMN_NAME, 2, LEN(c.COLUMN_NAME) - 10) AS Code,
        1 AS HasDatumPosl,
        CASE WHEN EXISTS (
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c2
          WHERE c2.TABLE_NAME = 'TabCisZam_EXT'
            AND c2.COLUMN_NAME = '_' + SUBSTRING(c.COLUMN_NAME, 2, LEN(c.COLUMN_NAME) - 10) + 'Pozadovano'
        ) THEN 1 ELSE 0 END AS HasPozadovano,
        ISNULL(t.validityMonths, 12) AS ValidityMonths
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN InspiritTraining t ON t.code = SUBSTRING(c.COLUMN_NAME, 2, LEN(c.COLUMN_NAME) - 10)
        AND t.deletedAt IS NULL
      WHERE c.TABLE_NAME = 'TabCisZam_EXT'
        AND c.TABLE_SCHEMA = 'dbo'
        AND c.COLUMN_NAME LIKE '[_]%DatumPosl'
        AND c.COLUMN_NAME NOT LIKE '[_]HeIQ%'
      ORDER BY Code
    `);

    const completeTrainings = trainings.filter(
      (t) => t.HasDatumPosl && t.HasPozadovano
    );
    const incompleteTrainings = trainings.filter(
      (t) => !t.HasDatumPosl || !t.HasPozadovano
    );

    return NextResponse.json({
      success: true,
      totalColumns: trainings.length,
      completeTrainings: completeTrainings.map((t) => ({
        code: t.Code,
        validityMonths: t.ValidityMonths
      })),
      incompleteTrainings: incompleteTrainings.map((t) => ({
        code: t.Code,
        missingPozadovano: !t.HasPozadovano
      })),
      message: `Nalezeno ${completeTrainings.length} kompletních školení (mají DatumPosl i Pozadovano)`
    });
  } catch (error) {
    console.error('[regenerate-view] Error:', error);
    return NextResponse.json(
      {
        error: 'Chyba při načítání preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
