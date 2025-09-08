const { execSync } = require('child_process');

console.log('🚀 Starting Vercel build process...');

// Set DATABASE_URL to DATABASE_URL_NEON for Prisma
if (process.env.DATABASE_URL_NEON) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_NEON;
  console.log('📋 Using Neon PostgreSQL database on Vercel');
}

// Generate Prisma client from Neon schema
console.log('🔧 Generating Prisma client for Neon...');
execSync('npx prisma generate --schema=./prisma/schema.neon.prisma', {
  stdio: 'inherit'
});

// Run Next.js build
console.log('📦 Building Next.js application...');
execSync('npx next build', { stdio: 'inherit' });

console.log('✅ Vercel build completed successfully!');
