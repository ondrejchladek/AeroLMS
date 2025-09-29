# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Claude Code Session Start

## 🔥 Quick Start Checklist

```bash
# 1. Setup project
cd AeroLMS
npm install  # Automatically runs postinstall.js → generates Prisma client

# 2. Environment variables
cp .env.example .env.local
# Edit .env.local with SQL Server connection string

# 3. Database setup (SQL Server local)
npx prisma migrate dev     # Apply migrations
npx prisma db seed         # Seed test data (optional)

# 4. Start development
npm run dev  # http://localhost:3000

# 5. Login with credentials
# Admin/Trainer: email + password (test@test.cz)
# Worker: personal code + password (123456)

# 6. Open Prisma Studio (správně pro lokál)
npx dotenv -e .env.local -- prisma studio

# 7. For Vercel deployment
# Set environment variables in Vercel dashboard:
# - DB_PROVIDER=neon
# - DATABASE_URL_NEON=postgresql://...
# - NEXTAUTH_URL, NEXTAUTH_SECRET
```

## Project Overview

**AeroLMS v1.0.0** - Employee Training System (Systém školení zaměstnanců)

A production-ready learning management system featuring employee training modules, assessment capabilities, and comprehensive progress tracking. Built with Next.js 15, React 19, and Microsoft SQL Server.

## 🔐 Role-Based Access Control System

The system implements three user roles with distinct permissions:

### User Roles

- **ADMIN** 👑
  - Full system access
  - Manage trainers and training assignments
  - Create/edit/delete all trainings and tests
  - Access admin dashboard and synchronization tools
  - Can manually enter test results for workers
  - View all test variants
  - Example user: `test@test.cz`

- **TRAINER** 👨‍🏫
  - Edit assigned trainings (name, description, content)
  - Create and manage tests for assigned trainings
  - View training statistics and test results
  - Can override training names from database codes
  - Can manually enter test results for first-time tests
  - View all test variants and activate/deactivate them
  - Manage multiple test variants per training

- **WORKER** 👷
  - View required trainings
  - Take tests and assessments (only active tests visible)
  - View training materials and progress
  - Must complete ALL active tests for each training
  - Can retake test only 1 month before expiration
  - Maximum 2 attempts, then must take test in person
  - First test must be taken in person with trainer
  - Login: personal code + password (example: code `123456` + password)

## 🔄 Automatic Training Synchronization

The system dynamically generates training content based on database columns:

### How It Works
1. **On Application Start** (`src/instrumentation.ts`):
   - Calls `initializeTrainings()` from `lib/init-trainings.ts`
   - Scans User table for training columns pattern: `{code}DatumPosl`, `{code}DatumPristi`, `{code}Pozadovano`
   - Creates missing Training records automatically via `lib/training-sync.ts`
   - Preserves existing training data

2. **Manual Synchronization**:
   - Admin page: `/admin/prehled` (integrated into admin dashboard)
   - Button: "Spustit manuální synchronizaci"
   - API endpoint: `POST /api/admin/sync-trainings`

3. **Debug Tools** (not part of application):
   - `prisma/check-columns.js` - Manual script for database analysis
   - Run with: `node prisma/check-columns.js`

### Training Detection Pattern
For each training, the system looks for three columns in User table:
- `{code}DatumPosl` - Last completion date
- `{code}DatumPristi` - Next due date
- `{code}Pozadovano` - Required flag (boolean)

Example: `CMMDatumPosl`, `CMMDatumPristi`, `CMMPozadovano` → Creates training with code "CMM"

## 📚 Advanced Testing System

### Test Configuration
- **Multiple Test Variants**: Each training can have multiple test variants
- **Visibility Control**: Workers see only active test, trainers/admins see all
- **Default Settings**:
  - Passing score: 75%
  - Time limit: 15 minutes (configurable by trainer)
- **Question Types**:
  - Single choice
  - Multiple choice (with partial scoring)
  - Yes/No
  - Text (keyword matching or exact match)

### Testing Rules for Workers
1. **First Test**: Must be taken in person with trainer
2. **Retake Policy**: Can retake test only 1 month before expiration (DatumPristi)
3. **Attempt Limit**: Maximum 2 failed attempts, then must take in person
4. **Scoring System**:
   - Each question can have multiple correct answers
   - Partial points for multiple choice questions
   - Penalty for incorrect selections
   - Must achieve 75% to pass

### Certificate Generation
- Automatic PDF certificate upon successful test completion
- Unique certificate number (format: CERT-YYYY-XXXXX)
- Valid for 1 year from issue date
- Stored in database with training and test attempt reference

## Available MCP Servers

Claude Code has access to these MCP servers (configured globally):

- **Playwright** (`mcp__playwright__`) - Browser automation, E2E testing, web scraping
- **Magic** (`mcp__magic__`) - UI component generation with `/ui` and `/21` commands, logo search with `/logo`
- **Sequential Thinking** (`mcp__sequential-thinking__`) - Step-by-step problem solving and analysis
- **Context7** (`mcp__context7__`) - Library documentation lookup for any framework/library
- **IDE** (`mcp__ide__`) - VS Code integration for diagnostics and code execution
- **Basic Memory** (`mcp__basic-memory`) - Persistent knowledge base for storing project insights and solutions
- **Shadcn** (`mcp__shadcn__`) - Direct access to shadcn/ui component source code and demos

These servers enhance development capabilities and are available immediately in all Claude Code sessions.

### Technology Stack

- **Framework**: Next.js 15.3.5 with App Router and Turbopack
- **Runtime**: React 19.0.0, TypeScript 5.7.2 (strict mode)
- **UI Components**:
  - shadcn/ui (full suite of Radix UI components)
  - Tailwind CSS v4.0.0 with tailwindcss-animate
  - Lucide React & Tabler Icons for iconography
- **Database (Oddělená prostředí)**:
  - **Lokální vývoj**: Microsoft SQL Server Express 2019 (localhost:1433)
    - Schema: `prisma/schema.prisma`
    - Environment: `.env.local` s `DATABASE_URL`
    - Migrace: `prisma/migrations/`
  - **Produkce (Vercel)**: Neon PostgreSQL
    - Schema: `prisma/schema.neon.prisma`
    - Environment: Vercel env variables s `DATABASE_URL_NEON`
    - Synchronizace: `prisma db push` při buildu
  - Prisma ORM v6.11.1 as database abstraction layer
  - **Důležité**: Lokál a produkce jsou zcela oddělené, bez sdílených migrací
- **Authentication**: NextAuth v4.24.11 with JWT strategy (employee code-based)
- **State Management**:
  - Zustand v5.0.2 for client state
  - Nuqs v2.4.1 for URL search params state
- **Forms & Validation**:
  - React Hook Form v7.54.1
  - Zod v3.24.1 for schema validations
- **Data Tables**:
  - Tanstack React Table v8.21.2
  - Server-side pagination/filtering via Nuqs
- **Charts**: Recharts v2.15.1 for data visualization
- **PDF Generation**: @react-pdf/renderer v4.3.0 for training content export
- **Command Palette**: kbar v0.1.0-beta.45 for Cmd+K interface
- **Error Tracking**: Sentry/NextJS v9.19.0
- **Date Handling**: date-fns v4.1.0
- **Code Quality**:
  - ESLint 8.48.0 with TypeScript plugin
  - Prettier 3.4.2 with Tailwind plugin
  - Husky v9.1.7 for pre-commit hooks
  - Lint-staged for staged files

## Development Commands

```bash
# Development with Turbopack
npm run dev              # Starts on http://localhost:3000

# Production build
npm run build            # Creates .next production build
npm run start            # Starts production server

# Code Quality
npm run lint             # Run Next.js linter
npm run lint:fix         # Fix linting issues and format (NOTE: package.json references pnpm, use npm)
npm run lint:strict      # Fail on any warnings
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without fixing

# Database operations (Prisma with SQL Server)
npx prisma migrate dev   # Run migrations in development
npx prisma db push       # Push schema changes without migration
npx prisma generate      # Generate Prisma client
npx prisma db seed       # Seed database (runs prisma/seed.js)

# ⚠️ DŮLEŽITÉ: Správné spuštění Prisma Studio s lokální databází
npx dotenv -e .env.local -- prisma studio  # ✅ SPRÁVNĚ - načte DATABASE_URL z .env.local
# NIKDY nepoužívej: npx prisma studio     # ❌ ŠPATNĚ - chybí DATABASE_URL

# SQL Server Management
# Use SQL Server Management Studio (SSMS) to manage database
# Database: AeroLMS on localhost:1433

# Type checking
npx tsc --noEmit         # Check TypeScript types without emitting files

# Git hooks (auto-installed)
npm run prepare          # Setup Husky pre-commit hooks
```

## Key Features

### Dashboard Pages
- **Overview** (`/`): Main dashboard with real-time statistics from database
  - Statistics cards with emoji indicators (🔵🟢🔴🟡) and user-friendly labels
  - Bar chart showing upcoming trainings by month
  - Recent completions list with last 5 trainings
  - Full training table with columns:
    - Název školení (Training name)
    - Požadováno (Required: Yes/No)
    - Poslední absolvování (Last completion date)
    - Platnost do (Valid until date)
    - Status (Visual status with icons: ✅ Platné, ⚠️ Brzy vyprší, ❌ Prošlé, ⏳ Čeká na první absolvování)
    - Akce (Actions: Open button)
- **Dynamic Training Routes** (`[[...node]]`): Handles training modules with dynamic path segments
  - Training overview with continuous content display (no collapsible sections)
  - PDF export functionality for training content
  - Test mode with assessment capabilities
  - Results display with scoring
- **Profil** (`/profil`): User profile management page
- **Login** (`/login`): Universal login form with email or personal code + password

### UI Components Library (shadcn/ui)
All components are in `src/components/ui/`:

**Note**: To get the latest shadcn/ui v4 component implementations, use the Shadcn UI v4 MCP server:
- Example: "Get me the latest Button component from shadcn/ui"
- Example: "Show me the DataTable implementation with all features"
- This helps ensure components are up-to-date with the latest shadcn/ui patterns

Components currently in the project:
- **Forms**: Button, Input, Textarea, Select, Checkbox, Radio Group, Switch, Slider, Form
- **Feedback**: Alert, Alert Dialog, Toast (Sonner), Progress, Skeleton
- **Overlays**: Dialog, Sheet, Popover, Tooltip, Hover Card, Context Menu, Dropdown Menu
- **Navigation**: Tabs, Breadcrumb, Navigation Menu, Sidebar, Menubar
- **Data Display**: Table (with advanced features), Card, Badge, Avatar
- **Layout**: Separator, Scroll Area, Aspect Ratio, Collapsible, Resizable
- **Advanced**: 
  - Calendar with date-fns
  - Command (cmdk) for search
  - Date Picker (React Day Picker)
  - Input OTP for verification codes
  - File Uploader with dropzone
- **Animations**: All components support motion/animations

## Architecture

### Authentication Flow
- NextAuth with JWT strategy using email or personal code + password
- **Login form**: Single universal field "E-mail / Osobní číslo" + password
  - Admins/Trainers: Use email (e.g., test@test.cz) + password
  - Workers: Use personal code (e.g., 123456) + password
- System automatically detects if identifier is email or code (by presence of '@')
- All users must have password in database
- Protected routes: `/dashboard/*` and `/api/*`
- Sign-in page: `/login`
- Session data includes `user.id`, `user.code`, `user.email`, and `user.role`
- Middleware protection in `src/middleware.ts`

### Database Architecture
- **Database Server**: Microsoft SQL Server Express 2019 (local instance)
- **Database Name**: AeroLMS
- **Port**: 1433 (default SQL Server port)
- **Authentication**: Windows Integrated Security
- **ORM**: Prisma v6.11.1 with sqlserver provider
- **Schema location**: `prisma/schema.prisma`
- **Connection**: Uses `DATABASE_URL` environment variable

### Database Models
- **User**: Employee records with:
  - Unique employee code for authentication
  - Role field (ADMIN, TRAINER, WORKER)
  - Multiple training date tracking fields (DatumPosl/DatumPristi/Pozadovano pattern)
  - Each training module tracks: last completion, next due date, required flag
- **Training**: Training modules with code, name, description, and content
  - Code: Database column identifier (e.g., "CMM", "EDM")
  - Name: Display name (can be overridden by trainers)
- **Test**: Assessment tests linked to trainings with passing score and time limits
  - Multiple tests per training support
  - Active/inactive status for test management
- **Question**: Test questions with types, options, correct answers, and points
- **TestAttempt**: User test attempts with scores, completion status, and signature data
- **TrainingAssignment**: Many-to-many relationship between trainers and trainings

### Routing Structure
- **App Router** with Next.js 15
- Main routes:
  - `app/(dashboard)/[[...node]]/` - Dynamic training routes with catch-all segments
  - `app/(dashboard)/profil/` - User profile page
  - `app/(dashboard)/admin/` - Admin dashboard and tools
  - `app/(dashboard)/trainer/` - Trainer dashboard and management
  - `app/login/` - Authentication page with sign-in-view component
- Admin routes:
  - `/admin/prehled` - Admin dashboard (includes synchronization, user management, training management)
  - `/admin/assignments` - Training assignments for workers
- Trainer routes:
  - `/trainer` - Trainer dashboard (My trainings overview)
  - `/trainer/prvni-testy` - First tests page (Manual test result entry for in-person tests)
  - `/trainer/vysledky` - Results page (View all test results by employee)
  - `/trainer/training/[code]/edit` - Edit training details
  - `/trainer/training/[code]/tests` - Manage tests for training
  - `/trainer/test/[id]/edit` - Edit test details
  - `/trainer/test/[id]/questions` - Manage test questions
- API routes - See API Endpoints section above

### State Management
- **Nuqs** for URL search params state management
- Form state handled by React Hook Form with Zod validation

### Component Architecture
```
src/components/
├── ui/           # Shadcn UI primitive components
├── layout/       # App layout components (sidebar, header)
├── kbar/         # Command palette (Cmd+K) interface
└── modal/        # Modal components

src/features/     # Feature-based modules
├── */components/ # Feature-specific components
├── */utils/      # Feature utilities and stores
```

### Data Tables
- **Tanstack React Table v8** for complex tables
- Server-side pagination, filtering, and sorting via Nuqs
- Column definitions in `*/product-tables/columns.tsx`
- Table toolbar with faceted filters and view options
- Built-in sorting, filtering, column visibility toggles
- Row selection and actions support

### Additional Libraries
- **Motion v11.17**: Animation library for smooth transitions
- **Sonner v1.7**: Toast notifications system
- **Vaul v1**: Drawer component for mobile
- **cmdk v1.1**: Command menu (Cmd+K support)
- **react-dropzone v14**: File upload with drag & drop
- **react-resizable-panels v2**: Resizable layout panels
- **react-responsive v10**: Media query hooks
- **match-sorter v8**: Fuzzy search for filtering
- **uuid v11**: Unique ID generation
- **Input OTP v1.4**: One-time password inputs
- **React Day Picker v8**: Date picker component

## API Endpoints - Complete List (16 files)

### Training APIs
- **GET /api/trainings** - List trainings (role-based: admin/trainer gets all, workers get their assigned)
- **GET /api/trainings/[id]/content** - Get training content sections
- **PUT /api/trainings/[id]** - Update training (name, description, content) - trainer/admin only
- **GET /api/trainings/[id]/tests** - Get all tests for a training (multiple test support)
- **POST /api/trainings/[id]/tests** - Create new test for training (trainer/admin only)
- **POST /api/trainings/[id]/test/start** - Start a new test attempt (with testId in body)
- **GET /api/trainings/by-code/[code]** - Get training by code
- **GET /api/trainings/slug/[slug]** - Get training by URL slug
- **GET /api/trainings/[id]/pdf** - Generate and download training content as PDF

### Test Management
- **GET /api/tests/[id]** - Get test details with questions
- **PUT /api/tests/[id]** - Update test including questions (trainer/admin only)
- **DELETE /api/tests/[id]** - Delete test (admin only)

### Test Attempts
- **POST /api/test-attempts/[id]/submit** - Submit test answers and calculate score
- **POST /api/test-attempts/manual** - Create manual test attempt (trainers/admins only, for in-person tests)
- **GET /api/test-attempts/manual** - Get manual test attempts for a user (trainers/admins only)

### User Management
- **GET /api/users** - List all users (admin only)
- **PATCH /api/users/[userId]** - Update user (admin only, for role assignment)

### Admin Functions
- **POST /api/admin/sync-trainings** - Manually sync trainings from User columns to Training table

### Data Import (Legacy)
- **POST /api/excel-data** - Import data from Excel (kept for future use)

## Key Implementation Patterns

### Forms
- Use React Hook Form with Zod schemas
- Schema definitions in `features/*/utils/form-schema.ts`
- Form components follow pattern in `features/*/components/*-form.tsx`

### API Calls
- Server Actions preferred over API routes when possible
- Use Prisma client imported from `@/lib/prisma`
- Handle errors with try-catch and return appropriate responses

### Styling
- Tailwind CSS v4 with `tailwind-merge` for className merging
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Component variants handled by `class-variance-authority`

### Error Handling
- Sentry integration for production error tracking
- Error boundaries with error.tsx files at route levels
- Global error handler in `app/global-error.tsx`

### Training Content Rendering Pattern
- Training content displays as continuous flow without collapsible sections
- All content sections visible immediately on page load
- Content types supported: introduction, keyPoints, rules, standards, tolerances, defects, documents, ppe, hazards, emergency
- Each content type has dedicated rendering logic with appropriate icons and styling
- Content centered with `max-w-[1200px] mx-auto` for optimal reading
- Example structure in `app/(dashboard)/[[...node]]/training-client.tsx`

### PDF Export Feature
- Uses @react-pdf/renderer for server-side PDF generation
- PDF document component: `components/training/training-pdf-document.tsx`
- Preserves all content formatting and structure in PDF
- Supports Czech characters with Roboto font family
- Automatic filename generation with training name and date
- API endpoint: `/api/trainings/[id]/pdf`

### Test Mode Switching Pattern
- ViewMode state manages transitions: 'overview' | 'test' | 'results'
- Separate components for each mode: 
  - `src/components/training/test-form.tsx` - Assessment form with questions
  - `src/components/training/test-results.tsx` - Score display and feedback
- Test flow: handleStartTest → fetch test → start attempt → submit → show results
- Navigation maintains state: handleBackToOverview, handleRetryTest
- Loading states and error handling for async operations

## Project Structure Details

### File Organization
```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication routes
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── api/                
│   │   ├── auth/          # NextAuth API route
│   │   └── trainings/     
│   │       └── [id]/      
│   │           └── pdf/   # PDF generation endpoint
│   └── globals.css        # Global styles with Tailwind directives
├── components/            
│   ├── ui/                # 40+ shadcn/ui components
│   ├── training/          # Training-specific components
│   │   ├── training-pdf-document.tsx  # PDF generator
│   │   ├── test-form.tsx             # Test interface
│   │   └── test-results.tsx          # Results display
│   ├── layout/            # App-wide layout components
│   │   ├── app-sidebar.tsx
│   │   ├── header.tsx
│   │   ├── providers.tsx  # All context providers
│   │   └── ThemeToggle/   # Theme switching components
│   └── kbar/              # Command palette implementation
├── features/              # Feature-based modules
│   ├── prehled/          # Dashboard overview components
│   │   └── components/   
│   │       ├── bar-graph.tsx
│   │       ├── recent-sales.tsx
│   │       └── trainings-table.tsx
│   ├── products/         # Product management (deprecated,old)
│   └── profil/          # User profile
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
├── types/                # TypeScript type definitions
└── middleware.ts         # NextAuth middleware
```

### Styling System
- **Tailwind CSS v4** with PostCSS
- **CSS Variables** for theming in `app/theme.css`
- **cn() utility** for className merging from `lib/utils.ts`
- **CVA (class-variance-authority)** for component variants
- **Dark Mode** support via next-themes

### Performance Features
- **Turbopack** for fast development builds
- **React 19** with improved performance
- **Sharp** for optimized image processing
- **Parallel Routes** for independent component loading
- **nextjs-toploader** for page transition feedback

## Configuration Files

### Next.js Configuration (`next.config.ts`)
- Image optimization for remote patterns
- Sentry integration with source maps
- Transpiles `geist` package
- Monitoring route at `/monitoring` for Sentry

### TypeScript Configuration (`tsconfig.json`)
- Strict mode enabled
- Path aliases: `@/*` → `./src/*`, `~/*` → `./public/*`
- Target: ES2020
- Module resolution: Node

### Prisma Configuration
**Local Development (SQL Server)**:
- Database: Microsoft SQL Server Express 2019
- Port: 1433 (default SQL Server port)
- Database name: AeroLMS
- Authentication: Windows Integrated Security
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Seed: `prisma/seed.js`

**Production (Neon PostgreSQL)**:
- Schema: `prisma/schema.neon.prisma`
- Migrations: `prisma/migrations-neon/` (if needed)
- Sync: `prisma db push` (preferred)
- Seed: `prisma/seed-roles-neon.js`

### Tailwind Configuration
- Version 4.0 with PostCSS
- Animation utilities via `tailwindcss-animate`
- Custom theme variables in `app/theme.css`

## Environment Variables

### Local Development
Required in `.env.local`:
```
# Database - Microsoft SQL Server Express 2019
DATABASE_URL="sqlserver://localhost:1433;database=AeroLMS;trustServerCertificate=true;encrypt=true;integratedSecurity=true"

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                 # Generate with: openssl rand -base64 32

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=         # Sentry DSN for error tracking
NEXT_PUBLIC_SENTRY_ORG=         # Sentry organization
NEXT_PUBLIC_SENTRY_PROJECT=     # Sentry project name
NEXT_PUBLIC_SENTRY_DISABLED=    # Set to "true" to disable Sentry
```

### Vercel Production
Required in Vercel Environment Variables:
```
# Database - Neon PostgreSQL
DB_PROVIDER=neon                # Triggers Neon build process
DATABASE_URL_NEON=postgresql://user:password@host/database?sslmode=require

# Authentication
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=                 # Generate secure secret

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=         # Production Sentry DSN
```

## Custom Hooks Available

The project includes several custom hooks in `src/hooks/`:
- `use-breadcrumbs.tsx` - Breadcrumb navigation management
- `use-callback-ref.ts` and `use-callback-ref.tsx` - Stable callback references (duplicate files)
- `use-controllable-state.tsx` - Controlled/uncontrolled state pattern
- `use-data-table.ts` - Data table state management
- `use-debounce.tsx` - Debounced values
- `use-debounced-callback.ts` - Debounced callbacks
- `use-media-query.ts` - Responsive design hooks
- `use-mobile.tsx` - Mobile device detection
- `use-multistep-form.tsx` - Multi-step form navigation

## Testing Approach

Currently no test scripts configured. To add testing:
```bash
# Unit/Integration testing
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event jest-environment-jsdom

# E2E testing with Playwright (MCP server available)
npm install --save-dev @playwright/test
# or
npm install --save-dev cypress
```

### Testing Patterns
- **Unit tests**: Co-locate with components as `*.test.ts(x)`
- **API tests**: In `app/api/**/*.test.ts`
- **E2E tests**: Use Playwright MCP for browser automation
- **Run single test file**: `npm test -- path/to/test.test.ts`
- **Run specific test by name**: `npm test -- -t "test name pattern"`
- **Debug tests**: `npm run test:watch` then press `p` to filter
- **Coverage report**: `npm test -- --coverage`

## Important Conventions

1. **TypeScript**: Strict mode enabled - ensure all types are properly defined
2. **Imports**: Use path aliases `@/*` for src directory, `~/*` for public
3. **Components**: Server components by default, add `"use client"` only when needed
4. **Authentication**: Always check session in protected routes
5. **Database**: Use Prisma transactions for multiple related operations
6. **Forms**: Always validate with Zod schemas before submission
7. **Styling**: Use Tailwind classes, avoid inline styles
8. **Icons**: Prefer Lucide React icons, fallback to Tabler Icons

## Package Management

### Scripts Overview
```json
{
  "dev": "next dev --turbopack",        // Development with Turbopack
  "build": "next build",                // Production build
  "start": "next start",                // Start production server
  "lint": "next lint",                  // ESLint check
  "lint:fix": "eslint src --fix && npm run format",  // Fix and format
  "lint:strict": "eslint --max-warnings=0 src",   // Strict linting
  "format": "prettier --write .",       // Format all files
  "format:check": "prettier -c -w .",   // Check formatting
  "prepare": "husky"                    // Setup git hooks
}
```

### Key Dependencies
- **UI Framework**: React 19 + Next.js 15.3.5
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Data**: Prisma + SQL Server
- **Forms**: React Hook Form + Zod
- **State**: Zustand + Nuqs
- **Tables**: Tanstack React Table
- **Charts**: Recharts
- **PDF Generation**: @react-pdf/renderer v4.3.0
- **Auth**: NextAuth v4

### Development Dependencies
- **@faker-js/faker v9**: Mock data generation
- **@prisma/client v6**: Database client
- **bcryptjs v3**: Password hashing (Note: Using bcryptjs not bcrypt)
- **TypeScript ESLint Plugin**: Type-aware linting
- **Husky v9**: Git hooks management
- **lint-staged v15**: Run linters on staged files
- **Prettier with Tailwind plugin**: Code formatting
- **tsx v4**: TypeScript execution for scripts

### Pre-commit Configuration
Lint-staged runs on staged files:
```json
{
  "**/*.{js,jsx,tsx,ts,css,less,scss,sass}": [
    "prettier --write --no-error-on-unmatched-pattern"
  ]
}
```

## Testing Approach

### E2E Testing with Playwright MCP
Use the Playwright MCP server for browser automation:
```javascript
// Example: Test login flow
mcp__playwright__browser_navigate({ url: "http://localhost:3000/login" })
mcp__playwright__browser_type({ element: "Employee Code input", text: "12345" })
mcp__playwright__browser_click({ element: "Sign in button" })

// Test training module navigation
mcp__playwright__browser_snapshot() // Get accessibility snapshot
mcp__playwright__browser_click({ element: "Training module link" })
mcp__playwright__browser_wait_for({ text: "Training Overview" })
```

### Unit Testing
Currently no test scripts configured. To add testing:
```bash
# Unit/Integration testing
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event jest-environment-jsdom

# E2E testing with Playwright (MCP server available)
npm install --save-dev @playwright/test
```

### Testing Patterns
- **Unit tests**: Co-locate with components as `*.test.ts(x)`
- **API tests**: In `app/api/**/*.test.ts`
- **E2E tests**: Use Playwright MCP for browser automation
- **Run single test file**: `npm test -- path/to/test.test.ts`
- **Run specific test by name**: `npm test -- -t "test name pattern"`
- **Debug tests**: `npm run test:watch` then press `p` to filter
- **Coverage report**: `npm test -- --coverage`

## Recent Changes & Fixes

### UI & Authentication Improvements (January 2025)
1. **Unified Login System**:
   - Simplified login form with single "E-mail / Osobní číslo" field + password
   - Removed tabs, now one universal form for all user roles
   - System auto-detects email vs. personal code (by presence of '@')
   - All users (admin, trainer, worker) now require password authentication
2. **Dashboard Enhancements**:
   - Statistics cards updated with emoji indicators (🔵🟢🔴🟡)
   - Training table columns renamed for better clarity
   - New Status column with visual icons (✅ Platné, ⚠️ Brzy vyprší, ❌ Prošlé, ⏳ Čeká)
3. **Trainer Features**:
   - New "První testy" page (`/trainer/prvni-testy`) for manual test result entry
   - New "Výsledky" page (`/trainer/vysledky`) for viewing all test results
   - Menu updated with new trainer pages
4. **Admin Dashboard Consolidation**:
   - Synchronization moved from `/admin/synchronizace` to `/admin/prehled`
   - Removed `/admin/nove-skoleni` page (trainings now created only via auto sync)
   - Integrated synchronization UI with manual sync button in admin dashboard
   - Training creation only through database column pattern (no manual creation)

### Deployment Simplification (December 2024)
1. **Two separate environments**:
   - Local = SQL Server Express (always)
   - Vercel = Neon PostgreSQL (always)
   - No shared migrations or complex switching
2. **Simplified scripts**:
   - `postinstall.js` - 6 lines, just generates Prisma client
   - `build.js` - Simple conditional for Vercel vs local
3. **Database sync**: Using `db push` instead of complex migrations

### TypeScript Fixes (December 2024)
1. **Date serialization in assignments**: Convert Date to ISO string for client components
2. **Prisma relation names**: Use `trainingAssignments` not `assignments`
3. **Icons setup**: Added `refresh` icon for admin synchronization
4. **bcrypt import fix**: Changed from `bcrypt` to `bcryptjs` for compatibility

### RBAC System Implementation
- Added role field to User model (ADMIN/TRAINER/WORKER)
- Created TrainingAssignment model for trainer assignments
- Automatic training synchronization from database columns
- Multiple tests per training support
- Dynamic content generation based on User table columns

## Common Pitfalls to Avoid

1. Don't modify global Next.js config without understanding implications
2. SQL Server specific considerations:
   - Uses Windows Authentication (Integrated Security)
   - Requires SQL Server Express 2019 running on localhost:1433
   - Database name must be "AeroLMS"
   - Remember T-SQL syntax when writing raw queries
3. Parallel routes in overview need independent error handling
4. Employee code authentication is number-based, not string
5. Zustand stores persist locally - consider privacy implications
6. React 19 is used - some libraries may have compatibility issues
7. Tailwind v4 uses different config format than v3

## 🔧 Recent Code Changes & Fixes

### Prisma Type Casting Removal (December 2024)
Removed `prisma as any` type casting from the following files to improve type safety:

**Files modified:**
1. `src/app/api/trainings/route.ts` - 4 instances
2. `src/app/api/users/[userId]/route.ts` - 1 instance
3. `src/app/api/users/route.ts` - 1 instance
4. `src/app/api/trainings/slug/[slug]/route.ts` - 3 instances
5. `src/app/api/trainings/by-code/[code]/route.ts` - 2 instances
6. `src/app/api/trainings/[id]/pdf/route.ts` - 3 instances
7. `src/app/api/trainings/[id]/content/route.ts` - 1 instance
8. `src/app/api/test-attempts/[id]/submit/route.ts` - 3 instances
9. `src/app/(dashboard)/[[...node]]/page.tsx` - 7 instances
10. `src/components/server-breadcrumbs.tsx` - 2 instances

**Note**: If TypeScript type checking fails after these changes, you may need to:
1. Run `npx prisma generate` to regenerate the Prisma client
2. Or temporarily revert by adding `as any` back to the affected lines
3. The type casting was originally used due to SQL Server case sensitivity issues

## Quick Component Examples

### Using shadcn/ui Button
```tsx
import { Button } from "@/components/ui/button"

<Button variant="outline" size="sm">Click me</Button>
```

### Form with Validation
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const schema = z.object({
  name: z.string().min(1, "Required")
})
```

### Protected Page
```tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  // ...
}
```

## Database Troubleshooting

If Prisma cannot connect to SQL Server:

1. **Verify SQL Server is running**:
   - Open Services (services.msc)
   - Check "SQL Server (SQLEXPRESS)" or "SQL Server (MSSQLSERVER)" is running

2. **Check SQL Server Configuration**:
   - Open SQL Server Configuration Manager
   - Enable TCP/IP protocol if needed
   - Verify port 1433 is configured

3. **Test connection**:
   ```bash
   npx prisma db pull  # Test if Prisma can connect
   ```

4. **Create database if missing**:
   ```sql
   -- Run in SSMS or sqlcmd
   CREATE DATABASE AeroLMS;
   ```

## Code Style Standards

- **Functions**: Prefer arrow functions with annotated return types
- **Props**: Always destructure props in components
- **Types**: Avoid `any` type, use `unknown` or strict generics
- **Imports**: Group imports: react → next → libraries → local
- **Naming**: 
  - camelCase for variables/functions
  - PascalCase for components
  - UPPER_SNAKE_CASE for constants
- **Components**: Server Components by default, add `"use client"` only when needed

## Common Patterns

### API Route Structure
```typescript
// app/api/[endpoint]/route.ts
export async function GET/POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Implementation
}
```

### Server Component Pattern
```typescript
// Default - runs on server
export default async function Page() {
  const data = await fetch('...', { cache: 'force-cache' });
  return <div>{/* UI */}</div>;
}
```

### Client Component Pattern
```typescript
'use client';
import { useState } from 'react';

export function InteractiveComponent() {
  const [state, setState] = useState();
  // Client-side logic
}
```

## Debugging Tips

- **Component not rendering?** Check if it needs `"use client"` directive
- **Auth issues?** Verify NextAuth session and employee code format
- **SQL Server connection failed?** Check if service is running and port 1433 is open
- **Prisma errors?** Run `npx prisma generate` after schema changes
- **Dark theme problems?** Check ThemeProvider wrapper in layout
- **TypeScript errors?** Run `npx tsc --noEmit` for detailed type checking
- **Parallel routes not loading?** Each needs its own error.tsx and loading.tsx
- **Route protection failing?** Check middleware.ts configuration

## Key Components for Training System

### Training Components
- **Training Client** (`app/(dashboard)/[[...node]]/training-client.tsx`): Main training interface with mode switching
  - Continuous content display (no collapsibles)
  - PDF download functionality with loading states
  - Enlarged action buttons with cursor pointer
  - Real-time database integration
- **Training PDF Document** (`components/training/training-pdf-document.tsx`): PDF generation component
  - Server-side rendering for PDF
  - Full Czech language support
  - Preserves all content types and formatting
- **Test Form** (`components/training/test-form.tsx`): Renders questions and handles answer submission
- **Test Results** (`components/training/test-results.tsx`): Displays scores and completion status
- **Trainings Table** (`features/prehled/components/trainings-table.tsx`): Lists all available trainings
  - Database-driven data display
  - Color-coded status indicators
  - "Neurčeno" text for undefined next dates

### Dashboard Components
- **Bar Graph** (`features/prehled/components/bar-graph.tsx`): Upcoming trainings by month
- **Recent Sales** (`features/prehled/components/recent-sales.tsx`): Last 5 completed trainings with status icons

### Supporting Features
- Dynamic URL-based routing for training modules
- Session-based authentication with employee codes
- Real-time progress tracking from database
- PDF export for training content
- Signature capture for test completion
- Automatic date tracking for training compliance
- Real-time statistics widgets on dashboard

## 🚀 Deployment Architecture

### Simplified Two-Environment Setup
- **Local Development**: Always SQL Server Express 2019
- **Production (Vercel)**: Always Neon PostgreSQL
- **No shared migrations or complex switching**

### Build & Deploy Scripts

#### `scripts/postinstall.js` (6 lines)
```javascript
// Always generates Prisma client for local SQL Server
execSync('prisma generate', { stdio: 'inherit' });
```

#### `scripts/build.js`
- **Local build**: Just runs `next build`
- **Vercel build** (when `DB_PROVIDER=neon`):
  1. Generates Prisma client from `schema.neon.prisma`
  2. Synchronizes database with `prisma db push`
  3. Builds Next.js application

### Vercel Deployment Process
1. **Automatic on push to main**:
   - Detects `DB_PROVIDER=neon` in environment
   - Runs `scripts/build.js` which handles everything
   - Database sync via `db push` (no complex migrations)

2. **Required Vercel Environment Variables**:
   ```
   DB_PROVIDER=neon
   DATABASE_URL_NEON=postgresql://...
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=...
   ```

3. **Post-deployment** (manual if needed):
   ```bash
   # Assign roles via seed script
   node prisma/seed-roles-neon.js
   ```

## Deployment Strategy

### Docker Deployment

#### Multi-stage Dockerfile
```dockerfile
# Dockerfile
FROM node:22-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Generate Prisma client for both schemas
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npx prisma generate --schema=./prisma/schema.neon.prisma

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
```

#### Docker Compose Development
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    command: npm run dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "sqlserver://sqlserver:1433;database=AeroLMS;trustServerCertificate=true"
      NEXTAUTH_URL: "http://localhost:3000"
      NEXTAUTH_SECRET: "development-secret"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - sqlserver

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2019-latest
    ports:
      - "1433:1433"
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "YourStrong@Password"
      MSSQL_PID: "Express"
    volumes:
      - sqlserver_data:/var/opt/mssql

volumes:
  sqlserver_data:
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '22'

jobs:
  # Linting and Type Checking
  lint:
    name: Code Quality
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run linter
        run: npm run lint:strict

      - name: Type check
        run: npx tsc --noEmit

      - name: Format check
        run: npm run format:check

  # Unit and Integration Tests
  test:
    name: Testing
    runs-on: ubuntu-latest
    needs: lint

    services:
      sqlserver:
        image: mcr.microsoft.com/mssql/server:2019-latest
        env:
          ACCEPT_EULA: Y
          SA_PASSWORD: Test@Password123
          MSSQL_PID: Express
        ports:
          - 1433:1433
        options: >-
          --health-cmd "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P Test@Password123 -Q 'SELECT 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run database migrations
        env:
          DATABASE_URL: "sqlserver://localhost:1433;database=AeroLMS_Test;user=sa;password=Test@Password123;trustServerCertificate=true"
        run: npx prisma migrate deploy

      - name: Run tests
        env:
          DATABASE_URL: "sqlserver://localhost:1433;database=AeroLMS_Test;user=sa;password=Test@Password123;trustServerCertificate=true"
          NEXTAUTH_SECRET: "test-secret"
        run: npm test

  # Build Docker Image
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/aerolms:latest
            ${{ secrets.DOCKER_USERNAME }}/aerolms:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  # Deploy to Production (Vercel/Neon)
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      - name: Run Neon migrations
        env:
          DATABASE_URL_NEON: ${{ secrets.DATABASE_URL_NEON }}
        run: |
          npx prisma migrate deploy --schema=./prisma/schema.neon.prisma

  # E2E Tests with Playwright
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.PRODUCTION_URL }}
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Azure DevOps Pipeline (Alternative)
```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  NODE_VERSION: '22.x'
  DOCKER_REGISTRY: 'aerolms.azurecr.io'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(NODE_VERSION)
            displayName: 'Install Node.js'

          - script: |
              npm ci --legacy-peer-deps
              npx prisma generate
            displayName: 'Install dependencies'

          - script: |
              npm run lint:strict
              npm run format:check
              npx tsc --noEmit
            displayName: 'Code quality checks'

          - script: npm test
            displayName: 'Run tests'

          - task: Docker@2
            inputs:
              containerRegistry: 'AzureContainerRegistry'
              repository: 'aerolms'
              command: 'buildAndPush'
              Dockerfile: '**/Dockerfile'
              tags: |
                $(Build.BuildId)
                latest

  - stage: Deploy
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToProduction
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebAppContainer@1
                  inputs:
                    azureSubscription: 'AeroLMS-Production'
                    appName: 'aerolms-app'
                    containers: '$(DOCKER_REGISTRY)/aerolms:$(Build.BuildId)'
```

### Production Deployment Checklist

#### Pre-deployment
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Backup strategy in place
- [ ] Monitoring setup (Application Insights/Sentry)
- [ ] Load testing completed

#### Deployment Process
- [ ] Create database backup
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Deploy to production (blue-green or canary)
- [ ] Verify health checks
- [ ] Monitor error rates and performance

#### Post-deployment
- [ ] Verify all features working
- [ ] Check database connections
- [ ] Monitor performance metrics
- [ ] Review error logs
- [ ] Update documentation
- [ ] Notify stakeholders

### Environment Management

#### Development
```env
DATABASE_URL="sqlserver://localhost:1433;database=AeroLMS_Dev"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SENTRY_DISABLED="true"
```

#### Staging
```env
DATABASE_URL="sqlserver://staging-server:1433;database=AeroLMS_Staging"
NEXTAUTH_URL="https://staging.aerolms.com"
NEXT_PUBLIC_SENTRY_DSN="staging-sentry-dsn"
```

#### Production
```env
DATABASE_URL_NEON="postgresql://..."
NEXTAUTH_URL="https://aerolms.com"
NEXT_PUBLIC_SENTRY_DSN="production-sentry-dsn"
```

### Monitoring & Observability

- **Application Performance**: Vercel Analytics / Azure Application Insights
- **Error Tracking**: Sentry with source maps
- **Uptime Monitoring**: UptimeRobot / Pingdom
- **Database Monitoring**: Azure SQL Analytics / Neon console
- **Log Aggregation**: Azure Log Analytics / Datadog

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