import { prisma } from '@/lib/prisma';
import { validateTrainingCode } from '@/lib/validation-schemas';

interface TrainingColumn {
  code: string;
  hasDatumPosl: boolean;
  hasPozadovano: boolean;
  // Note: DatumPristi is a COMPUTED COLUMN in InspiritCisZam VIEW, not a physical column in TabCisZam_EXT
  // It's calculated as: DATEADD(month, X, _*DatumPosl) where X varies per training (12, 24, or 36 months)
  // Therefore, we only detect DatumPosl + Pozadovano columns for training detection
}

/**
 * Get all column names from TabCisZam_EXT table containing training data
 * Uses raw SQL query to access database metadata
 *
 * IDENTICAL in DEV and PROD:
 * - Both environments query TabCisZam_EXT (where training columns are stored)
 */
async function getUserTableColumns(): Promise<string[]> {
  try {
    // Note: Table name cannot be parameterized in INFORMATION_SCHEMA query
    // Using direct string since 'TabCisZam_EXT' is a constant, not user input
    const result = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TabCisZam_EXT'
        AND TABLE_SCHEMA = 'dbo'
      ORDER BY ORDINAL_POSITION
      `
    );

    console.log('[getUserTableColumns] Found columns:', result.length);
    return result.map((row) => row.COLUMN_NAME);
  } catch (error) {
    console.error('[getUserTableColumns] Error:', error);
    return [];
  }
}

/**
 * Extract training codes from TabCisZam_EXT table columns
 * Looks for patterns: _{code}DatumPosl, _{code}Pozadovano
 *
 * Note: DatumPristi columns do NOT exist in TabCisZam_EXT - they are COMPUTED COLUMNS
 * in the InspiritCisZam VIEW, calculated as DATEADD(month, X, _{code}DatumPosl)
 *
 * A training is valid when it has both DatumPosl and Pozadovano columns.
 */
export async function detectTrainingColumns(): Promise<TrainingColumn[]> {
  try {
    const columns = await getUserTableColumns();
    const trainings = new Map<string, TrainingColumn>();

    for (const column of columns) {
      // Check for DatumPosl pattern
      if (column.endsWith('DatumPosl')) {
        let code = column.substring(0, column.length - 9); // Remove 'DatumPosl'
        // Remove underscore prefix if present (production: _CMMDatumPosl -> CMM)
        if (code.startsWith('_')) {
          code = code.substring(1);
        }
        if (!trainings.has(code)) {
          trainings.set(code, {
            code,
            hasDatumPosl: true,
            hasPozadovano: false
          });
        } else {
          trainings.get(code)!.hasDatumPosl = true;
        }
      }

      // Check for Pozadovano pattern
      else if (column.endsWith('Pozadovano')) {
        let code = column.substring(0, column.length - 10); // Remove 'Pozadovano'
        // Remove underscore prefix if present (production: _CMMPozadovano -> CMM)
        if (code.startsWith('_')) {
          code = code.substring(1);
        }
        if (!trainings.has(code)) {
          trainings.set(code, {
            code,
            hasDatumPosl: false,
            hasPozadovano: true
          });
        } else {
          trainings.get(code)!.hasPozadovano = true;
        }
      }
    }

    // Filter to only complete trainings (must have both DatumPosl AND Pozadovano)
    // DatumPristi is computed in VIEW, so we don't require it for detection
    const completeTrainings = Array.from(trainings.values()).filter(
      (t) => t.hasDatumPosl && t.hasPozadovano
    );

    console.log(`[detectTrainingColumns] Found ${completeTrainings.length} complete trainings:`,
      completeTrainings.map(t => t.code).join(', '));

    return completeTrainings;
  } catch (error) {
    console.error('[detectTrainingColumns] Error:', error);
    return [];
  }
}

/**
 * Synchronize detected trainings with Training table
 * Creates missing Training records with detected codes
 */
export async function syncTrainingsWithDatabase(): Promise<{
  created: string[];
  existing: string[];
  errors: string[];
}> {
  const result = {
    created: [] as string[],
    existing: [] as string[],
    errors: [] as string[]
  };

  try {
    // Get detected training codes from User columns
    const detectedTrainings = await detectTrainingColumns();
    const detectedCodes = detectedTrainings.map((t) => t.code);

    if (detectedCodes.length === 0) {
      return result;
    }

    // Get existing training codes from database
    const existingTrainings = await prisma.inspiritTraining.findMany({
      select: { code: true }
    });
    const existingCodes = new Set(existingTrainings.map((t) => t.code));

    // Find missing trainings
    const missingCodes = detectedCodes.filter(
      (code) => !existingCodes.has(code)
    );

    // Create missing trainings
    for (const code of missingCodes) {
      try {
        await prisma.inspiritTraining.create({
          data: {
            code,
            name: `Školení ${code}`, // Default name, trainer will update it
            description: `Automaticky vytvořené školení pro kód ${code}`
          }
        });
        result.created.push(code);
      } catch {
        result.errors.push(code);
      }
    }

    // Track existing trainings
    result.existing = detectedCodes.filter((code) => existingCodes.has(code));

    return result;
  } catch {
    return result;
  }
}

/**
 * Get user training data for specific training code
 * Returns the dates and required status for a user's training
 *
 * IDENTICAL in DEV and PROD:
 * - Queries InspiritCisZam VIEW → TabCisZam + TabCisZam_EXT + InspiritUserAuth
 */
export async function getUserTrainingData(
  userId: number,
  trainingCode: string
): Promise<{
  datumPosl: Date | null;
  datumPristi: Date | null;
  pozadovano: boolean;
} | null> {
  try {
    // SECURITY: Validate training code against whitelist to prevent SQL injection
    // This is CRITICAL because we're using dynamic column names in raw SQL
    try {
      validateTrainingCode(trainingCode);
    } catch {
      return null;
    }

    const columnDatumPosl = `_${trainingCode}DatumPosl`; // Note: _ prefix in database
    const columnDatumPristi = `_${trainingCode}DatumPristi`;
    const columnPozadovano = `_${trainingCode}Pozadovano`;

    // Use raw query to dynamically access columns
    // SAFE: trainingCode is validated against whitelist above
    //
    // InspiritCisZam VIEW → TabCisZam + TabCisZam_EXT + InspiritUserAuth (identical in dev and prod)
    const result = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        [${columnDatumPosl}] as datumPosl,
        [${columnDatumPristi}] as datumPristi,
        [${columnPozadovano}] as pozadovano
      FROM [InspiritCisZam]
      WHERE [ID] = @P1
    `,
      userId
    );

    if (result.length > 0) {
      return {
        datumPosl: result[0].datumPosl,
        datumPristi: result[0].datumPristi,
        pozadovano: result[0].pozadovano ?? false
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Update user training data after test completion
 *
 * IDENTICAL in DEV and PROD:
 * - Updates TabCisZam_EXT directly (more efficient than via VIEW trigger)
 */
export async function updateUserTrainingData(
  userId: number,
  trainingCode: string,
  datumPosl: Date,
  datumPristi?: Date
): Promise<boolean> {
  try {
    // SECURITY: Validate training code against whitelist to prevent SQL injection
    // This is CRITICAL because we're using dynamic column names in raw SQL
    try {
      validateTrainingCode(trainingCode);
    } catch {
      return false;
    }

    // Column names (with _ prefix in database)
    const columnDatumPosl = `_${trainingCode}DatumPosl`;
    const columnDatumPristi = `_${trainingCode}DatumPristi`;

    // Update TabCisZam_EXT directly (more efficient than VIEW)
    // SAFE: trainingCode is validated against whitelist above
    if (datumPristi) {
      await prisma.$executeRawUnsafe(
        `
        UPDATE [TabCisZam_EXT]
        SET
          [${columnDatumPosl}] = @P1,
          [${columnDatumPristi}] = @P2
        WHERE [ID] = @P3
      `,
        datumPosl,
        datumPristi,
        userId
      );
    } else {
      await prisma.$executeRawUnsafe(
        `
        UPDATE [TabCisZam_EXT]
        SET [${columnDatumPosl}] = @P1
        WHERE [ID] = @P2
      `,
        datumPosl,
        userId
      );
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get all user trainings with their status
 */
export async function getAllUserTrainings(userId: number): Promise<
  Array<{
    code: string;
    name: string;
    datumPosl: Date | null;
    datumPristi: Date | null;
    pozadovano: boolean;
    status: 'completed' | 'upcoming' | 'expired' | 'not_required';
  }>
> {
  try {
    const detectedTrainings = await detectTrainingColumns();
    const trainings = await prisma.inspiritTraining.findMany({
      where: {
        code: {
          in: detectedTrainings.map((t) => t.code)
        }
      }
    });

    const userTrainings = [];
    const now = new Date();

    for (const training of trainings) {
      const userData = await getUserTrainingData(userId, training.code);
      if (userData) {
        let status: 'completed' | 'upcoming' | 'expired' | 'not_required' =
          'not_required';

        if (userData.pozadovano) {
          if (!userData.datumPristi) {
            status = 'expired';
          } else if (userData.datumPristi < now) {
            status = 'expired';
          } else if (userData.datumPosl) {
            status = userData.datumPristi > now ? 'completed' : 'expired';
          } else {
            status = 'upcoming';
          }
        }

        userTrainings.push({
          code: training.code,
          name: training.name,
          datumPosl: userData.datumPosl,
          datumPristi: userData.datumPristi,
          pozadovano: userData.pozadovano,
          status
        });
      }
    }

    return userTrainings;
  } catch {
    return [];
  }
}
