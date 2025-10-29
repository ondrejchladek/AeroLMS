import { syncTrainingsWithDatabase } from './training-sync';

/**
 * Initialize trainings on app start
 * This function is called once when the app starts to ensure
 * all training columns in the User table have corresponding Training records
 */
export async function initializeTrainings() {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Training Init] Starting training synchronization...');
  }

  try {
    const result = await syncTrainingsWithDatabase();

    if (process.env.NODE_ENV === 'development') {
      console.log('[Training Init] Synchronization complete:', {
        created: result.created.length,
        existing: result.existing.length,
        errors: result.errors.length
      });

      if (result.created.length > 0) {
        console.log('[Training Init] Created trainings:', result.created);
      }

      if (result.errors.length > 0) {
        console.error('[Training Init] Failed to create:', result.errors);
      }
    }

    return result;
  } catch (error) {
    console.error('[Training Init] Failed to initialize trainings:', error);
    // Don't throw - app should still start even if sync fails
    return {
      created: [],
      existing: [],
      errors: []
    };
  }
}
