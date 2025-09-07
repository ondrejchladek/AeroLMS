const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Vercel build process...');

// Read Neon schema
const neonSchemaPath = path.join(__dirname, '../prisma/schema.neon.prisma');
const defaultSchemaPath = path.join(__dirname, '../prisma/schema.prisma');

console.log('📋 Preparing Neon schema for Vercel...');
let neonSchema = fs.readFileSync(neonSchemaPath, 'utf-8');

// Remove the custom output path so it generates to default location
neonSchema = neonSchema.replace(
  'output   = "../prisma/generated/client-neon"',
  '// output removed for Vercel build'
);

// Write modified schema as default
fs.writeFileSync(defaultSchemaPath, neonSchema);

// Generate Prisma client to default location (node_modules/@prisma/client)
console.log('🔧 Generating Prisma client to default location...');
execSync('npx prisma generate', { stdio: 'inherit' });

// Also generate to custom location for compatibility
console.log('🔧 Generating Neon-specific client...');
execSync('npx prisma generate --schema=./prisma/schema.neon.prisma', { stdio: 'inherit' });

// Run Next.js build
console.log('📦 Building Next.js application...');
execSync('npx next build', { stdio: 'inherit' });

console.log('✅ Vercel build completed successfully!');