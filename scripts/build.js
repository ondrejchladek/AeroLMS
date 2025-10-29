const { execSync } = require('child_process');

console.log('🏗️ Starting AeroLMS build process...');
console.log('📊 Environment: ' + (process.env.NODE_ENV || 'development'));

// Simple Next.js build - no database operations
console.log('📦 Building Next.js application...');
execSync('npx next build', { stdio: 'inherit' });

console.log('✅ Build completed successfully!');
