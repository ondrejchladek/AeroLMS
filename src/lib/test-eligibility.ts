/**
 * Shared test eligibility logic for AeroLMS
 *
 * Centralized business rules for test-taking eligibility:
 * 1. Max attempts rule: Max 2 failed attempts since last success
 * 2. First test rule: First test must be taken in person with trainer
 * 3. Retake window rule: Can only retake 1 month before expiration
 *
 * Used by:
 * - GET /api/trainings/[id]/test/check-eligibility
 * - POST /api/trainings/[id]/test/start
 */

import { prisma } from '@/lib/prisma';
import { getUserTrainingData } from '@/lib/training-sync';

/**
 * Eligibility check result
 */
export interface EligibilityResult {
  eligible: boolean;
  reason: EligibilityReason;
  message: string;
  data?: {
    failedAttempts?: number;
    nextAllowedDate?: string;
    daysUntilAllowed?: number;
    requiresInPerson?: boolean;
    existingAttemptId?: number;
  };
}

/**
 * Reason codes for eligibility status
 */
export type EligibilityReason =
  | 'eligible'
  | 'continue_existing'
  | 'no_test'
  | 'test_not_found'
  | 'user_not_found'
  | 'training_data_not_found'
  | 'max_attempts'
  | 'first_test'
  | 'too_early';

/**
 * Check if a user is eligible to take a test
 *
 * @param userId - User ID
 * @param testId - Test ID
 * @param trainingCode - Training code for fetching training data
 * @param userRole - User role (same rules for all roles)
 * @returns Eligibility result with reason and message
 *
 * @example
 * const result = await checkTestEligibility(123, 456, 'CMM', 'WORKER');
 * if (!result.eligible) {
 *   return NextResponse.json({ error: result.message }, { status: 403 });
 * }
 */
export async function checkTestEligibility(
  userId: number,
  testId: number,
  trainingCode: string
): Promise<EligibilityResult> {
  // Get training data using raw SQL (Prisma can't access dynamic columns)
  const trainingData = await getUserTrainingData(userId, trainingCode);

  if (!trainingData) {
    return {
      eligible: false,
      reason: 'training_data_not_found',
      message: 'Data školení nebyla nalezena',
    };
  }

  // Check 1: Max attempts rule (2 failed attempts since last success)
  const maxAttemptsResult = await checkMaxAttempts(userId, testId);
  if (!maxAttemptsResult.eligible) {
    return maxAttemptsResult;
  }

  // Check 2 & 3: Only for required trainings
  const isRequired = trainingData.pozadovano === true;

  if (isRequired) {
    // Check 2: First test rule
    const lastCompletionDate = trainingData.datumPosl;
    if (!lastCompletionDate) {
      return {
        eligible: false,
        reason: 'first_test',
        message: 'První test musí být absolvován osobně se školitelem',
        data: { requiresInPerson: true },
      };
    }

    // Check 3: Retake window rule (1 month before expiration)
    const nextDueDate = trainingData.datumPristi;
    if (nextDueDate) {
      const today = new Date();
      const dueDate = new Date(nextDueDate);
      const oneMonthBefore = new Date(dueDate);
      oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);

      if (today < oneMonthBefore) {
        const daysUntilAllowed = Math.ceil(
          (oneMonthBefore.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          eligible: false,
          reason: 'too_early',
          message: `Test můžete opakovat až měsíc před vypršením platnosti (za ${daysUntilAllowed} dní)`,
          data: {
            nextAllowedDate: oneMonthBefore.toISOString(),
            daysUntilAllowed,
          },
        };
      }
    }
  }

  return {
    eligible: true,
    reason: 'eligible',
    message: 'Test je připraven ke spuštění',
  };
}

/**
 * Check max attempts rule
 *
 * Business rule: Max 2 failed attempts since last successful attempt.
 * After 2 failures, worker must take test in person with trainer.
 *
 * @param userId - User ID
 * @param testId - Test ID
 * @returns Eligibility result
 */
async function checkMaxAttempts(
  userId: number,
  testId: number
): Promise<EligibilityResult> {
  // Find the most recent successful attempt (online OR manual by trainer)
  const lastSuccessfulAttempt = await prisma.inspiritTestAttempt.findFirst({
    where: {
      testId: testId,
      userId: userId,
      passed: true,
      completedAt: { not: null },
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Count failed attempts AFTER the last successful attempt
  const failedAttempts = await prisma.inspiritTestAttempt.count({
    where: {
      testId: testId,
      userId: userId,
      passed: false,
      completedAt: { not: null },
      deletedAt: null,
      ...(lastSuccessfulAttempt && {
        createdAt: {
          gt: lastSuccessfulAttempt.createdAt,
        },
      }),
    },
  });

  if (failedAttempts >= 2) {
    return {
      eligible: false,
      reason: 'max_attempts',
      message:
        'Po dvou neúspěšných pokusech musíte absolvovat test osobně se školitelem',
      data: {
        failedAttempts,
        requiresInPerson: true,
      },
    };
  }

  return {
    eligible: true,
    reason: 'eligible',
    message: 'Test je připraven ke spuštění',
    data: { failedAttempts },
  };
}

/**
 * Check if there's an unfinished attempt for a user/test
 *
 * @param userId - User ID
 * @param testId - Test ID
 * @returns Existing attempt ID if found, null otherwise
 */
export async function findUnfinishedAttempt(
  userId: number,
  testId: number
): Promise<number | null> {
  const existingAttempt = await prisma.inspiritTestAttempt.findFirst({
    where: {
      testId: testId,
      userId: userId,
      completedAt: null,
      deletedAt: null,
    },
  });

  return existingAttempt?.id ?? null;
}

/**
 * Get the count of failed attempts since last success
 *
 * @param userId - User ID
 * @param testId - Test ID
 * @returns Count of failed attempts
 */
export async function getFailedAttemptsCount(
  userId: number,
  testId: number
): Promise<number> {
  const lastSuccessfulAttempt = await prisma.inspiritTestAttempt.findFirst({
    where: {
      testId: testId,
      userId: userId,
      passed: true,
      completedAt: { not: null },
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return prisma.inspiritTestAttempt.count({
    where: {
      testId: testId,
      userId: userId,
      passed: false,
      completedAt: { not: null },
      deletedAt: null,
      ...(lastSuccessfulAttempt && {
        createdAt: {
          gt: lastSuccessfulAttempt.createdAt,
        },
      }),
    },
  });
}
