const { execSync } = require('child_process');

// Postinstall vždy generuje lokální SQL Server client
// Na Vercelu se to stejně přepíše v build.js
console.log('Generating Prisma client for local development...');
execSync('prisma generate', { stdio: 'inherit' });