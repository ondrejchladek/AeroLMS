const { execSync } = require('child_process');

// Only run this directly if called from command line
if (require.main === module) {
  console.log('🚀 Starting Vercel build process...');
  console.log('📊 DB_PROVIDER:', process.env.DB_PROVIDER);
  console.log('📊 DATABASE_URL_NEON exists:', !!process.env.DATABASE_URL_NEON);

  // Generate Prisma client from Neon schema which uses DATABASE_URL_NEON
  console.log('🔧 Generating Prisma client for Neon (using DATABASE_URL_NEON)...');
  execSync('npx prisma generate --schema=./prisma/schema.neon.prisma', {
    stdio: 'inherit'
  });

  // Run Next.js build
  console.log('📦 Building Next.js application...');
  execSync('npx next build', { stdio: 'inherit' });

  console.log('✅ Vercel build completed successfully!');
}
