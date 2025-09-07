const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Vercel build process...');

// Copy Neon schema to default location
const neonSchemaPath = path.join(__dirname, '../prisma/schema.neon.prisma');
const defaultSchemaPath = path.join(__dirname, '../prisma/schema.prisma');

console.log('📋 Copying Neon schema to default location...');
fs.copyFileSync(neonSchemaPath, defaultSchemaPath);

// Generate Prisma client (will use the copied schema)
console.log('🔧 Generating Prisma client...');
execSync('npx prisma generate', { stdio: 'inherit' });

// Also generate to custom location for compatibility
console.log('🔧 Generating Neon-specific client...');
execSync('npx prisma generate --schema=./prisma/schema.neon.prisma', { stdio: 'inherit' });

// Run Next.js build
console.log('📦 Building Next.js application...');
execSync('npx next build', { stdio: 'inherit' });

console.log('✅ Vercel build completed successfully!');