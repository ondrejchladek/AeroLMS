/**
 * Centrální Zod validation schemas pro API endpoints
 * Zajišťuje konzistentní input validaci napříč celou aplikací
 */

import { z } from 'zod';

// ============================================================================
// TRAINING SCHEMAS
// ============================================================================

export const UpdateTrainingSchema = z.object({
  name: z
    .string()
    .min(1, 'Název je povinný')
    .max(255, 'Název je příliš dlouhý'),
  description: z
    .string()
    .max(1000, 'Popis je příliš dlouhý')
    .optional()
    .nullable(),
  content: z.string().optional().nullable()
});

export type UpdateTrainingInput = z.infer<typeof UpdateTrainingSchema>;

// ============================================================================
// TEST SCHEMAS
// ============================================================================

export const QuestionTypeEnum = z.enum([
  'single',
  'multiple',
  'yes_no',
  'text'
]);

export const QuestionSchema = z.object({
  question: z.string().min(1, 'Otázka je povinná').max(1000),
  type: QuestionTypeEnum,
  options: z
    .array(z.string().min(1).max(500))
    .min(0)
    .max(20, 'Příliš mnoho možností')
    .optional()
    .nullable(),
  correctAnswer: z.union([
    z.string(),
    z.array(z.string()),
    z.boolean(),
    z.number()
  ]),
  points: z
    .number()
    .positive('Body musí být kladné číslo')
    .max(100, 'Maximum 100 bodů na otázku'),
  required: z.boolean().optional().default(true),
  explanation: z.string().max(2000).optional().nullable()
});

// Base test schema for reusability (DRY principle)
const TestSchemaBase = z.object({
  title: z.string().min(1, 'Název testu je povinný').max(255),
  description: z.string().max(2000).optional().nullable(),
  passingScore: z
    .number()
    .min(0, 'Minimální procento je 0%')
    .max(100, 'Maximální procento je 100%')
    .default(75),
  timeLimit: z
    .number()
    .positive('Časový limit musí být kladné číslo')
    .max(240, 'Maximum 240 minut')
    .optional()
    .nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  questions: z
    .array(QuestionSchema)
    .min(1, 'Test musí obsahovat alespoň 1 otázku')
    .max(100, 'Maximum 100 otázek na test')
});

export const CreateTestSchema = TestSchemaBase.refine(
  (data) => {
    if (data.validFrom && data.validTo) {
      return new Date(data.validFrom) < new Date(data.validTo);
    }
    return true;
  },
  {
    message: 'Datum platnosti od musí být před datem platnosti do',
    path: ['validTo']
  }
);

export type CreateTestInput = z.infer<typeof CreateTestSchema>;

export const UpdateTestSchema = TestSchemaBase.partial()
  .extend({
    id: z.number().positive()
  })
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return new Date(data.validFrom) < new Date(data.validTo);
      }
      return true;
    },
    {
      message: 'Datum platnosti od musí být před datem platnosti do',
      path: ['validTo']
    }
  );

export type UpdateTestInput = z.infer<typeof UpdateTestSchema>;

// ============================================================================
// TEST ATTEMPT SCHEMAS
// ============================================================================

export const AnswerSchema = z.object({
  questionId: z.number().positive(),
  answer: z.union([z.string(), z.array(z.string()), z.boolean(), z.number()])
});

export const SubmitTestSchema = z
  .object({
    answers: z.record(
      z.string(),
      z.union([z.string(), z.array(z.string()), z.boolean(), z.number()])
    )
  })
  .refine((data) => Object.keys(data.answers).length > 0, {
    message: 'Musíte odpovědět alespoň na 1 otázku',
    path: ['answers']
  });

export type SubmitTestInput = z.infer<typeof SubmitTestSchema>;

export const ManualTestAttemptSchema = z.object({
  userId: z.number().positive('Neplatné ID uživatele'),
  testId: z.number().positive('Neplatné ID testu'),
  score: z
    .number()
    .min(0, 'Minimální skóre je 0%')
    .max(100, 'Maximální skóre je 100%'),
  passed: z.boolean(),
  notes: z
    .string()
    .max(2000, 'Poznámky jsou příliš dlouhé')
    .optional()
    .nullable()
});

export type ManualTestAttemptInput = z.infer<typeof ManualTestAttemptSchema>;

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const UserRoleEnum = z.enum(['ADMIN', 'TRAINER', 'WORKER']);

export const UpdateUserRoleSchema = z.object({
  role: UserRoleEnum
});

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(10)
});

export const UserIdQuerySchema = z.object({
  userId: z.coerce.number().positive('Neplatné ID uživatele')
});

export const TrainingIdQuerySchema = z.object({
  trainingId: z.coerce.number().positive('Neplatné ID školení')
});

// ============================================================================
// TRAINING CODE VALIDATION (SQL Injection Prevention Only)
// ============================================================================

/**
 * DŮLEŽITÉ: Training kódy jsou DYNAMICKÉ!
 *
 * Školení jsou definována sloupci v databázi (TabCisZam_EXT):
 * - DB admin ručně přidává sloupce: _{code}DatumPosl, _{code}DatumPristi, _{code}Pozadovano
 * - Aplikace automaticky detekuje nové sloupce (detectTrainingColumns() v training-sync.ts)
 * - ŽÁDNÝ statický whitelist - co je v DB, to je platné
 *
 * Tato validace slouží POUZE jako SQL injection ochrana:
 * - Kontroluje jen alfanumerické znaky (A-Z, a-z, 0-9)
 * - NEKONTROLUJE existenci školení v databázi
 * - Pokud sloupec neexistuje, SQL dotaz selže s "Invalid column name"
 *
 * Pro získání seznamu platných kódů použij:
 * import { detectTrainingColumns } from '@/lib/training-sync';
 * const validCodes = await detectTrainingColumns();
 */
const TRAINING_CODE_PATTERN = /^[A-Za-z0-9]+$/;
const MIN_CODE_LENGTH = 2;
const MAX_CODE_LENGTH = 50;

/**
 * Validates training code format (SQL injection prevention ONLY)
 *
 * ⚠️ NEVALIDUJE EXISTENCI ŠKOLENÍ V DATABÁZI!
 * Pouze kontroluje, že kód obsahuje jen bezpečné znaky (alfanumerické).
 *
 * @throws {Error} if code contains unsafe characters
 *
 * @example
 * // ✅ POVOLENÉ (bezpečné znaky)
 * validateTrainingCode('CMM');           // OK
 * validateTrainingCode('EleZnaceni');    // OK
 * validateTrainingCode('NovaSkupina');   // OK - i když neexistuje v DB
 *
 * // ❌ ZAKÁZANÉ (SQL injection risk)
 * validateTrainingCode("CMM'; DROP--");  // THROW
 * validateTrainingCode('../etc/passwd'); // THROW
 * validateTrainingCode('CMM OR 1=1');    // THROW
 */
export function validateTrainingCode(code: string): void {
  // Délka check
  if (code.length < MIN_CODE_LENGTH || code.length > MAX_CODE_LENGTH) {
    throw new Error(
      `Training code must be between ${MIN_CODE_LENGTH} and ${MAX_CODE_LENGTH} characters, got: ${code.length}`
    );
  }

  // Pattern check (SQL injection ochrana - POUZE alfanumerické znaky)
  if (!TRAINING_CODE_PATTERN.test(code)) {
    throw new Error(
      `Invalid training code format: "${code}". Only alphanumeric characters (A-Z, a-z, 0-9) are allowed.`
    );
  }

  // ⚠️ NEVALIDUJEME EXISTENCI V DB!
  // Pokud sloupec neexistuje, SQL dotaz selže s "Invalid column name _${code}DatumPosl"
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely parses JSON with validation
 */
export function safeJsonParse<T = unknown>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Validates and parses request body with Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return { success: false, error: errorMessage };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Invalid JSON body' };
  }
}

/**
 * Validates query parameters with Zod schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);

  if (!result.success) {
    const errorMessage = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return { success: false, error: errorMessage };
  }

  return { success: true, data: result.data };
}
