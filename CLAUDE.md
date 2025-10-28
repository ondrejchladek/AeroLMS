### Quick Deployment to Corporate Server (PM2 + IIS)

For detailed step-by-step instructions, see `deployment/SIMPLE_SETUP.md`.

#### Prerequisites
- Windows Server with IIS
- Node.js 22.x installed
- PM2 installed globally (`npm install -g pm2 pm2-windows-service`)
- Git installed
- SQL Server access (10.235.1.8:1433, database: Helios003)

#### Deployment Steps

1. **Clone Repository**
   ```powershell
   cd C:\inetpub\wwwroot
   git clone https://github.com/your-org/AeroLMS.git
   cd AeroLMS
   ```

2. **Install Dependencies**
   ```powershell
   npm install
   ```

3. **Configure Environment**
   - Create `.env.production` with DATABASE_URL
   - Set NEXTAUTH_URL and NEXTAUTH_SECRET

4. **Build Application**
   ```powershell
   # Disable Sentry if no internet access
   $env:NEXT_PUBLIC_SENTRY_DISABLED="true"
   npx next build
   ```

5. **Setup PM2**
   ```powershell
   # Start application
   pm2 start ecosystem.config.js

   # Install as Windows Service
   pm2-service-install -n PM2
   pm2 save
   ```

6. **Configure IIS**
   - Install URL Rewrite Module and ARR
   - Create website pointing to project folder
   - Configure reverse proxy to localhost:3000
   - `web.config` is already in the project

7. **Database Setup**
   - Apply schema changes MANUALLY via SQL commands
   - NEVER run `prisma migrate` on production
   - Test changes on local/staging first

#### Updates

```powershell
# Stop application
pm2 stop aerolms

# Pull changes
git pull origin main

# Apply schema changes MANUALLY via SQL (if needed)

# Rebuild
npx next build

# Restart
pm2 restart aerolms
```

#### ⚠️ Important Notes
- **Database Schema**: Production database contains other tables not related to this project
- **No Automatic Migrations**: All schema changes must be applied manually via SQL
- **Internet Access**: Build may require access to fonts.googleapis.com for Google Fonts

### Corporate Server Monitoring
### Corporate Server Monitoring

- **Application Performance**: IIS logs and PM2 monitoring
- **Error Tracking**: Sentry (optional, can be disabled)
- **Database Monitoring**: SQL Server Management Studio
- **Application Logs**: PM2 logs (`pm2 logs aerolms`)

## Important Reminders for Claude Code

- **Never create files** unless absolutely necessary for the task
- **Always prefer editing** existing files over creating new ones
- **Never proactively create** documentation files (*.md) unless explicitly requested
- **Use MCP tools** when available:
  - Context7 for library documentation
  - Playwright for browser testing
  - Magic for UI component generation
  - Sequential Thinking for complex problem solving
  - Shadcn for getting latest shadcn/ui component source code and demos
  - Basic Memory for persistent knowledge storage
- **Check existing patterns** before implementing new ones
- **Follow project conventions** for imports, naming, and structure
- **Run linting** after significant changes: `npm run lint:fix`
- **Test authentication** flow when modifying auth-related code
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
