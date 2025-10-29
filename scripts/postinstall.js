const { execSync } = require('child_process');

// Postinstall generates Prisma client for SQL Server
console.log('Generating Prisma client...');
execSync('prisma generate', { stdio: 'inherit' });
