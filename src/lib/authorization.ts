/**
 * Authorization Helpers for AeroLMS
 *
 * Enterprise-grade authorization utilities for role-based access control.
 * Provides centralized logic for training assignments, audit logging, and security.
 *
 * @module lib/authorization
 */

import { prisma } from '@/lib/prisma';
import { isAdmin, isTrainer, isWorker } from '@/types/roles';

/**
 * Training assignment authorization result
 */
export interface TrainingAuthResult {
  authorized: boolean;
  trainingIds: number[];
  reason?: string;
}

/**
 * Authorization audit log entry
 */
interface AuthAuditLog {
  userId: number;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: number;
  authorized: boolean;
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Get all training IDs assigned to a trainer
 *
 * @param trainerId - User ID of the trainer
 * @returns Array of training IDs the trainer is assigned to
 *
 * @example
 * const trainingIds = await getTrainerAssignedTrainingIds(123);
 * // Returns: [1, 5, 12]
 */
export async function getTrainerAssignedTrainingIds(
  trainerId: number
): Promise<number[]> {
  const assignments = await prisma.inspiritTrainingAssignment.findMany({
    where: {
      trainerId,
      deletedAt: null // Exclude soft-deleted assignments
    },
    select: { trainingId: true }
  });

  return assignments.map((a) => a.trainingId);
}

/**
 * Get all trainings assigned to a trainer with full details
 *
 * @param trainerId - User ID of the trainer
 * @returns Array of training objects with tests
 *
 * @example
 * const trainings = await getTrainerAssignedTrainings(123);
 * // Returns full training objects with tests
 */
export async function getTrainerAssignedTrainings(trainerId: number) {
  const assignments = await prisma.inspiritTrainingAssignment.findMany({
    where: {
      trainerId,
      deletedAt: null // Exclude soft-deleted assignments
    },
    include: {
      training: {
        include: {
          tests: {
            where: { deletedAt: null }, // Exclude soft-deleted tests
            orderBy: { createdAt: 'desc' }
          }
        }
      }
    },
    orderBy: { assignedAt: 'desc' }
  });

  return assignments.map((a) => a.training);
}

/**
 * Check if trainer has access to a specific training
 *
 * @param trainerId - User ID of the trainer
 * @param trainingId - Training ID to check
 * @returns Boolean indicating if trainer has access
 *
 * @example
 * const hasAccess = await isTrainerAssignedToTraining(123, 5);
 * if (!hasAccess) {
 *   throw new Error('Unauthorized');
 * }
 */
export async function isTrainerAssignedToTraining(
  trainerId: number,
  trainingId: number
): Promise<boolean> {
  const assignment = await prisma.inspiritTrainingAssignment.findUnique({
    where: {
      trainerId_trainingId: {
        trainerId,
        trainingId
      }
    }
  });

  // Check if assignment exists AND is not soft-deleted
  return assignment !== null && assignment.deletedAt === null;
}

/**
 * Check if trainer has access to a specific test (via training assignment)
 *
 * @param trainerId - User ID of the trainer
 * @param testId - Test ID to check
 * @returns Boolean indicating if trainer has access
 *
 * @example
 * const hasAccess = await isTrainerAssignedToTest(123, 42);
 * if (!hasAccess) {
 *   throw new Error('Unauthorized');
 * }
 */
export async function isTrainerAssignedToTest(
  trainerId: number,
  testId: number
): Promise<boolean> {
  const test = await prisma.inspiritTest.findUnique({
    where: { id: testId },
    select: { trainingId: true }
  });

  if (!test) {
    return false;
  }

  return isTrainerAssignedToTraining(trainerId, test.trainingId);
}

/**
 * Authorize user access to training based on role
 *
 * - ADMIN: Full access to all trainings
 * - TRAINER: Access only to assigned trainings
 * - WORKER: No management access
 *
 * @param userId - User ID
 * @param userRole - User role (ADMIN | TRAINER | WORKER)
 * @param trainingId - Optional training ID to check specific access
 * @returns Authorization result with training IDs and reason
 *
 * @example
 * const auth = await authorizeTrainingAccess(123, 'TRAINER', 5);
 * if (!auth.authorized) {
 *   return res.status(403).json({ error: auth.reason });
 * }
 */
export async function authorizeTrainingAccess(
  userId: number,
  userRole: string,
  trainingId?: number
): Promise<TrainingAuthResult> {
  // Admin has full access
  if (isAdmin(userRole)) {
    const allTrainings = await prisma.inspiritTraining.findMany({
      select: { id: true }
    });
    return {
      authorized: true,
      trainingIds: allTrainings.map((t) => t.id),
      reason: 'Admin has full access'
    };
  }

  // Trainer has access only to assigned trainings
  if (isTrainer(userRole)) {
    const trainingIds = await getTrainerAssignedTrainingIds(userId);

    // If checking specific training
    if (trainingId !== undefined) {
      const hasAccess = trainingIds.includes(trainingId);
      return {
        authorized: hasAccess,
        trainingIds: hasAccess ? [trainingId] : [],
        reason: hasAccess
          ? 'Trainer assigned to training'
          : 'Trainer not assigned to this training'
      };
    }

    // Return all assigned trainings
    return {
      authorized: trainingIds.length > 0,
      trainingIds,
      reason:
        trainingIds.length > 0
          ? 'Trainer has assigned trainings'
          : 'Trainer has no assigned trainings'
    };
  }

  // Worker has no management access
  return {
    authorized: false,
    trainingIds: [],
    reason: 'Workers cannot manage trainings'
  };
}

/**
 * Authorize user access to test based on role
 *
 * @param userId - User ID
 * @param userRole - User role
 * @param testId - Test ID to check
 * @returns Authorization result
 *
 * @example
 * const auth = await authorizeTestAccess(123, 'TRAINER', 42);
 * if (!auth.authorized) {
 *   return res.status(403).json({ error: auth.reason });
 * }
 */
export async function authorizeTestAccess(
  userId: number,
  userRole: string,
  testId: number
): Promise<{ authorized: boolean; reason?: string }> {
  // Admin has full access
  if (isAdmin(userRole)) {
    return {
      authorized: true,
      reason: 'Admin has full access'
    };
  }

  // Trainer must be assigned to the training that owns this test
  if (isTrainer(userRole)) {
    const hasAccess = await isTrainerAssignedToTest(userId, testId);
    return {
      authorized: hasAccess,
      reason: hasAccess
        ? 'Trainer assigned to training'
        : 'Trainer not assigned to this test'
    };
  }

  // Worker has no management access
  return {
    authorized: false,
    reason: 'Workers cannot manage tests'
  };
}

/**
 * Log authorization check for audit trail
 *
 * @param log - Audit log entry
 *
 * @example
 * await logAuthorizationCheck({
 *   userId: 123,
 *   userRole: 'TRAINER',
 *   action: 'UPDATE_TRAINING',
 *   resource: 'training',
 *   resourceId: 5,
 *   authorized: false,
 *   reason: 'Not assigned',
 *   timestamp: new Date()
 * });
 */
export async function logAuthorizationCheck(log: AuthAuditLog): Promise<void> {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUTH AUDIT]', {
      timestamp: log.timestamp.toISOString(),
      user: `${log.userId} (${log.userRole})`,
      action: log.action,
      resource: `${log.resource}${log.resourceId ? `#${log.resourceId}` : ''}`,
      result: log.authorized ? '✅ GRANTED' : '❌ DENIED',
      reason: log.reason,
      ...(log.metadata && { metadata: log.metadata })
    });
  }

  // In production, you would store this in database table or external service
  // Example:
  // await prisma.authAuditLog.create({ data: log });
}

/**
 * Get trainings for API response based on user role
 *
 * Centralized function for /api/trainings endpoint.
 * Returns appropriate trainings based on user role and permissions.
 *
 * @param userId - User ID
 * @param userRole - User role
 * @param options - Optional parameters (includeTests, etc.)
 * @returns Array of trainings user has access to
 *
 * @example
 * const trainings = await getTrainingsForUser(123, 'TRAINER', { includeTests: true });
 */
export async function getTrainingsForUser(
  userId: number,
  userRole: string,
  options: {
    includeTests?: boolean;
    orderBy?: 'name' | 'createdAt';
  } = {}
) {
  const { includeTests = false, orderBy = 'name' } = options;

  // Admin gets all trainings
  if (isAdmin(userRole)) {
    return prisma.inspiritTraining.findMany({
      where: {
        deletedAt: null // Exclude soft-deleted trainings
      },
      include: includeTests
        ? {
            tests: {
              where: { deletedAt: null }, // Exclude soft-deleted tests
              orderBy: { createdAt: 'desc' }
            }
          }
        : undefined,
      orderBy: {
        [orderBy]: orderBy === 'name' ? 'asc' : 'desc'
      }
    });
  }

  // Trainer gets only assigned trainings
  if (isTrainer(userRole)) {
    const trainingIds = await getTrainerAssignedTrainingIds(userId);

    return prisma.inspiritTraining.findMany({
      where: {
        id: { in: trainingIds },
        deletedAt: null // Exclude soft-deleted trainings
      },
      include: includeTests
        ? {
            tests: {
              where: { deletedAt: null }, // Exclude soft-deleted tests
              orderBy: { createdAt: 'desc' }
            }
          }
        : undefined,
      orderBy: {
        [orderBy]: orderBy === 'name' ? 'asc' : 'desc'
      }
    });
  }

  // Workers don't get training management access
  return [];
}

/**
 * Validate and authorize API request for training access
 *
 * Middleware-style helper for API routes.
 * Checks session, validates user, and authorizes training access.
 *
 * @param session - NextAuth session
 * @param trainingId - Optional training ID to check
 * @returns Authorization result with user info
 * @throws Error if unauthorized
 *
 * @example
 * const { user, trainingIds } = await validateTrainingAccess(session, trainingId);
 */
export async function validateTrainingAccess(
  session: any,
  trainingId?: number
): Promise<{
  user: { id: number; role: string };
  trainingIds: number[];
}> {
  if (!session?.user) {
    throw new Error('Unauthorized - No session');
  }

  const userId = parseInt(session.user.id);
  const userRole = session.user.role;

  const auth = await authorizeTrainingAccess(userId, userRole, trainingId);

  await logAuthorizationCheck({
    userId,
    userRole,
    action: 'ACCESS_TRAINING',
    resource: 'training',
    resourceId: trainingId,
    authorized: auth.authorized,
    reason: auth.reason,
    timestamp: new Date()
  });

  if (!auth.authorized) {
    throw new Error(auth.reason || 'Unauthorized');
  }

  return {
    user: { id: userId, role: userRole },
    trainingIds: auth.trainingIds
  };
}

/**
 * Validate and authorize API request for test access
 *
 * @param session - NextAuth session
 * @param testId - Test ID to check
 * @returns User info
 * @throws Error if unauthorized
 *
 * @example
 * const { user } = await validateTestAccess(session, testId);
 */
export async function validateTestAccess(
  session: any,
  testId: number
): Promise<{
  user: { id: number; role: string };
}> {
  if (!session?.user) {
    throw new Error('Unauthorized - No session');
  }

  const userId = parseInt(session.user.id);
  const userRole = session.user.role;

  const auth = await authorizeTestAccess(userId, userRole, testId);

  await logAuthorizationCheck({
    userId,
    userRole,
    action: 'ACCESS_TEST',
    resource: 'test',
    resourceId: testId,
    authorized: auth.authorized,
    reason: auth.reason,
    timestamp: new Date()
  });

  if (!auth.authorized) {
    throw new Error(auth.reason || 'Unauthorized');
  }

  return {
    user: { id: userId, role: userRole }
  };
}
