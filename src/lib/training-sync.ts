import { prisma } from '@/lib/prisma';
import { validateTrainingCode } from '@/lib/validation-schemas';

interface TrainingColumn {
  code: string;
  hasDatumPosl: boolean;
  hasDatumPristi: boolean;
  hasPozadovano: boolean;
}

/**
 * Get all column names from the User table
 * Uses raw SQL query to access database metadata
 */
async function getUserTableColumns(): Promise<string[]> {
  const result = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'User'
      AND TABLE_SCHEMA = 'dbo'
    ORDER BY ORDINAL_POSITION
  `;

  return result.map((row) => row.COLUMN_NAME);
}

/**
 * Extract training codes from User table columns
 * Looks for patterns: {code}DatumPosl, {code}DatumPristi, {code}Pozadovano
 */
export async function detectTrainingColumns(): Promise<TrainingColumn[]> {
  try {
    const columns = await getUserTableColumns();
    const trainings = new Map<string, TrainingColumn>();

    for (const column of columns) {
      // Check for DatumPosl pattern
      if (column.endsWith('DatumPosl')) {
        const code = column.substring(0, column.length - 9); // Remove 'DatumPosl'
        if (!trainings.has(code)) {
          trainings.set(code, {
            code,
            hasDatumPosl: true,
            hasDatumPristi: false,
            hasPozadovano: false
          });
        } else {
          trainings.get(code)!.hasDatumPosl = true;
        }
      }

      // Check for DatumPristi pattern
      else if (column.endsWith('DatumPristi')) {
        const code = column.substring(0, column.length - 11); // Remove 'DatumPristi'
        if (!trainings.has(code)) {
          trainings.set(code, {
            code,
            hasDatumPosl: false,
            hasDatumPristi: true,
            hasPozadovano: false
          });
        } else {
          trainings.get(code)!.hasDatumPristi = true;
        }
      }

      // Check for Pozadovano pattern
      else if (column.endsWith('Pozadovano')) {
        const code = column.substring(0, column.length - 10); // Remove 'Pozadovano'
        if (!trainings.has(code)) {
          trainings.set(code, {
            code,
            hasDatumPosl: false,
            hasDatumPristi: false,
            hasPozadovano: true
          });
        } else {
          trainings.get(code)!.hasPozadovano = true;
        }
      }
    }

    // Filter out incomplete trainings (must have all 3 columns)
    const completeTrainings = Array.from(trainings.values()).filter(
      (t) => t.hasDatumPosl && t.hasDatumPristi && t.hasPozadovano
    );

    return completeTrainings;
  } catch {
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
 * Detect if running in production environment
 * Production: Corporate SQL Server with Helios003 database
 * Development: Local SQL Server Express with User table
 */
function isProductionEnvironment(): boolean {
  return process.env.DB_ENVIRONMENT === 'production';
}

/**
 * Get user training data for specific training code
 * Returns the dates and required status for a user's training
 *
 * Environment-aware:
 * - Dev: Queries User table directly
 * - Prod: Queries User SYNONYM → InspiritUser VIEW → TabCisZam_EXT
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
    // Note: [User] works in both dev and prod:
    // - Dev: Physical User table
    // - Prod: User SYNONYM → InspiritCisZam VIEW → TabCisZam_EXT
    const result = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        [${columnDatumPosl}] as datumPosl,
        [${columnDatumPristi}] as datumPristi,
        [${columnPozadovano}] as pozadovano
      FROM [User]
      WHERE UserID = @p0
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
 * Environment-aware:
 * - Dev: Updates User table directly
 * - Prod: Updates TabCisZam_EXT directly (more efficient than via VIEW trigger)
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

    const isProd = isProductionEnvironment();

    // Column names (with _ prefix in database)
    const columnDatumPosl = `_${trainingCode}DatumPosl`;
    const columnDatumPristi = `_${trainingCode}DatumPristi`;

    // Determine target table and ID column based on environment
    // Production: Update TabCisZam_EXT directly (more efficient than VIEW)
    // Development: Update User table
    const targetTable = isProd ? 'TabCisZam_EXT' : 'User';
    const idColumn = isProd ? 'ID' : 'UserID';

    // SAFE: trainingCode is validated against whitelist above
    if (datumPristi) {
      await prisma.$executeRawUnsafe(
        `
        UPDATE [${targetTable}]
        SET
          [${columnDatumPosl}] = @p0,
          [${columnDatumPristi}] = @p1
        WHERE [${idColumn}] = @p2
      `,
        datumPosl,
        datumPristi,
        userId
      );
    } else {
      await prisma.$executeRawUnsafe(
        `
        UPDATE [${targetTable}]
        SET [${columnDatumPosl}] = @p0
        WHERE [${idColumn}] = @p1
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
