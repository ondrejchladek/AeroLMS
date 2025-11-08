/**
 * User helper utilities
 * Provides functions for working with user data across the application
 */

/**
 * Get full name from user's first and last name
 * @param user - User object with firstName and lastName
 * @returns Full name as "FirstName LastName"
 */
export function getFullName(user: {
  firstName: string;
  lastName: string;
}): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

/**
 * Get full name with optional null handling
 * @param user - User object with optional firstName and lastName
 * @returns Full name or fallback string
 */
export function getFullNameSafe(
  user: {
    firstName?: string | null;
    lastName?: string | null;
  },
  fallback = 'Uživatel'
): string {
  if (!user.firstName && !user.lastName) {
    return fallback;
  }

  return `${user.firstName || ''} ${user.lastName || ''}`.trim();
}
