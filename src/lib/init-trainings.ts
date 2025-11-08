import { syncTrainingsWithDatabase } from './training-sync';

/**
 * Initialize trainings on app start
 * This function is called once when the app starts to ensure
 * all training columns in the User table have corresponding Training records
 */
export async function initializeTrainings() {
  try {
    const result = await syncTrainingsWithDatabase();
    return result;
  } catch {
    // Don't throw - app should still start even if sync fails
    return {
      created: [],
      existing: [],
      errors: []
    };
  }
}
