import { NextResponse } from 'next/server';

/**
 * Standard error codes for API responses
 * Using consistent codes makes error handling predictable for clients
 */
export const ErrorCode = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  NOT_ASSIGNED: 'NOT_ASSIGNED',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ID: 'INVALID_ID',
  INVALID_INPUT: 'INVALID_INPUT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TRAINING_NOT_FOUND: 'TRAINING_NOT_FOUND',
  TEST_NOT_FOUND: 'TEST_NOT_FOUND',
  ATTEMPT_NOT_FOUND: 'ATTEMPT_NOT_FOUND',

  // Business logic errors (400/422)
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  MAX_ATTEMPTS_EXCEEDED: 'MAX_ATTEMPTS_EXCEEDED',
  TEST_NOT_ACTIVE: 'TEST_NOT_ACTIVE',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  OPERATION_FAILED: 'OPERATION_FAILED',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard API error response interface
 */
export interface ApiErrorResponse {
  error: string;
  code: ErrorCodeType;
  status: number;
  details?: unknown;
}

/**
 * Standard API success response interface
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Create a standardized error response
 *
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param code - Error code from ErrorCode enum
 * @param details - Additional error details (only in development)
 * @returns NextResponse with consistent JSON error format
 *
 * @example
 * // Basic usage
 * return errorResponse('User not found', 404, ErrorCode.USER_NOT_FOUND);
 *
 * @example
 * // With validation details
 * return errorResponse('Invalid input', 400, ErrorCode.VALIDATION_ERROR, zodError.issues);
 */
export function errorResponse(
  message: string,
  status: number,
  code: ErrorCodeType = ErrorCode.INTERNAL_ERROR,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error: message,
    code,
    status,
  };

  // Only include details in development for debugging
  if (process.env.NODE_ENV === 'development' && details !== undefined) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized success response
 *
 * @param data - Response data
 * @param message - Optional success message
 * @returns NextResponse with consistent JSON success format
 *
 * @example
 * return successResponse({ user: userData });
 *
 * @example
 * return successResponse({ id: newId }, 'Item created successfully');
 */
export function successResponse<T>(
  data?: T,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status: 200 });
}

/**
 * Shorthand error response helpers for common error types
 */

export const unauthorized = (message = 'Unauthorized') =>
  errorResponse(message, 401, ErrorCode.UNAUTHORIZED);

export const forbidden = (message = 'Insufficient permissions') =>
  errorResponse(message, 403, ErrorCode.FORBIDDEN);

export const notFound = (message = 'Resource not found') =>
  errorResponse(message, 404, ErrorCode.NOT_FOUND);

export const badRequest = (message: string, code: ErrorCodeType = ErrorCode.VALIDATION_ERROR, details?: unknown) =>
  errorResponse(message, 400, code, details);

export const serverError = (message = 'Internal server error', details?: unknown) =>
  errorResponse(message, 500, ErrorCode.INTERNAL_ERROR, details);
