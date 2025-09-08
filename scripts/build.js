const { execSync } = require('child_process');

console.log('🏗️ Starting build process...');
console.log('📊 Environment: DB_PROVIDER=' + (process.env.DB_PROVIDER || 'sqlserver'));

if (process.env.DB_PROVIDER === 'neon') {
  // Pro Neon generuj Prisma client z Neon schema a pak builduj
  console.log('🚀 Detected Neon environment...');
  console.log('📊 DATABASE_URL_NEON exists:', !!process.env.DATABASE_URL_NEON);
  
  console.log('🔧 Generating Prisma client for Neon (using DATABASE_URL_NEON)...');
  execSync('npx prisma generate --schema=./prisma/schema.neon.prisma', {
    stdio: 'inherit'
  });
  
  console.log('📦 Building Next.js application...');
  execSync('npx next build', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} else {
  // Pro lokální vývoj standardní next build
  console.log('💻 Local environment, using standard Next.js build...');
  execSync('npx next build', { stdio: 'inherit' });
}