const { execSync } = require('child_process');

console.log('Running postinstall script...');

// Check database provider
const dbProvider = process.env.DB_PROVIDER || 'sqlserver';

// On Vercel (DB_PROVIDER=neon), skip postinstall as we handle it in build script
if (dbProvider === 'neon') {
  console.log('DB_PROVIDER=neon detected - Prisma generation will be handled by build script');
} else {
  console.log('DB_PROVIDER=sqlserver - generating SQL Server Prisma client');
  // Generate the default client for SQL Server
  execSync('prisma generate', { stdio: 'inherit' });
}

console.log('Postinstall completed');