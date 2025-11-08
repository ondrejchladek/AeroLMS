import * as Sentry from '@sentry/nextjs';

const sentryOptions: Sentry.NodeOptions | Sentry.EdgeOptions = {
  // Sentry DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Enable Spotlight in development
  spotlight: process.env.NODE_ENV === 'development',

  // Adds request headers and IP for users, for more info visit
  sendDefaultPii: true,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false
};

export async function register() {
  console.log('🎯 [Instrumentation] register() called, NEXT_RUNTIME:', process.env.NEXT_RUNTIME);

  // Initialize Sentry if not disabled
  if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      Sentry.init(sentryOptions);
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      Sentry.init(sentryOptions);
    }
  }

  // Initialize trainings from database columns (runs ALWAYS, regardless of Sentry)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 [Instrumentation] Starting training initialization...');
    try {
      const { initializeTrainings } = await import('@/lib/init-trainings');
      const result = await initializeTrainings();
      console.log('✅ [Instrumentation] Training initialization completed:', result);
    } catch (error) {
      // Log error but continue starting the app
      console.error('❌ [Instrumentation] Failed to initialize trainings:', error);
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
