const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Running postinstall script...');

// Check if we're on Vercel
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
  console.log('Detected Vercel environment - using Neon schema');
  
  // Copy Neon schema to be the default schema for Vercel
  const neonSchemaPath = path.join(__dirname, '../prisma/schema.neon.prisma');
  const defaultSchemaPath = path.join(__dirname, '../prisma/schema.prisma');
  
  // Backup original schema if it exists
  if (fs.existsSync(defaultSchemaPath)) {
    fs.copyFileSync(defaultSchemaPath, defaultSchemaPath + '.backup');
  }
  
  // Copy Neon schema as default
  fs.copyFileSync(neonSchemaPath, defaultSchemaPath);
  
  // Generate both Prisma clients
  console.log('Generating Prisma clients...');
  execSync('prisma generate', { stdio: 'inherit' });
  execSync('prisma generate --schema=./prisma/schema.neon.prisma', { stdio: 'inherit' });
  
} else {
  console.log('Local environment - using default schema');
  // Just generate the default client for local development
  execSync('prisma generate', { stdio: 'inherit' });
}

console.log('Postinstall completed successfully');