# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Claude Code Session Start

## Project Overview

**AeroLMS v1.0.0** - Employee Training System (Systém školení zaměstnanců)

A production-ready learning management system featuring employee training modules, assessment capabilities, and comprehensive progress tracking. Built with Next.js 15, React 19, and Microsoft SQL Server.

## Available MCP Servers

Claude Code has access to these MCP servers (configured globally):

- **Playwright** (`mcp__playwright__`) - Browser automation, E2E testing, web scraping
- **Magic** (`mcp__magic__`) - UI component generation with `/ui` and `/21` commands, logo search with `/logo`
- **Sequential Thinking** (`mcp__sequential-thinking__`) - Step-by-step problem solving and analysis
- **Context7** (`mcp__context7__`) - Library documentation lookup for any framework/library
- **IDE** (`mcp__ide__`) - VS Code integration for diagnostics and code execution
- **Basic Memory** (`basic-memory`) - Persistent knowledge base for storing project insights and solutions
- **Shadcn UI v4** (`shadcn-ui-v4`) - Direct access to shadcn/ui v4 component source code (React/Svelte/Vue)

These servers enhance development capabilities and are available immediately in all Claude Code sessions.

### Technology Stack

- **Framework**: Next.js 15.3.5 with App Router and Turbopack
- **Runtime**: React 19.0.0, TypeScript 5.7.2 (strict mode)
- **UI Components**:
  - shadcn/ui (full suite of Radix UI components)
  - Tailwind CSS v4.0.0 with tailwindcss-animate
  - Lucide React & Tabler Icons for iconography
- **Database**:
  - Microsoft SQL Server Express 2019 (local installation)
  - Prisma ORM v6.11.1 as database abstraction layer
  - Database migrations in `prisma/migrations/`
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
npx prisma studio        # Open Prisma Studio GUI at :5555

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
  - Required, completed, expired, and upcoming trainings counters
  - Bar chart showing upcoming trainings by month
  - Recent completions list with last 5 trainings
  - Full training table with database-driven data
- **Dynamic Training Routes** (`[[...node]]`): Handles training modules with dynamic path segments
  - Training overview with continuous content display (no collapsible sections)
  - PDF export functionality for training content
  - Test mode with assessment capabilities
  - Results display with scoring
- **Profil** (`/profil`): User profile management page  
- **Login** (`/login`): Employee code-based authentication

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
- NextAuth with JWT strategy using employee codes (not email/password)
- Protected routes: `/dashboard/*` and `/api/*`
- Sign-in page: `/login`
- Session data includes `user.id` and `user.code`
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
  - Multiple training date tracking fields (DatumPosl/DatumPristi/Pozadovano pattern)
  - Each training module tracks: last completion, next due date, required flag
- **Training**: Training modules with code, name, description, and content
- **Test**: Assessment tests linked to trainings with passing score and time limits
- **Question**: Test questions with types, options, correct answers, and points
- **TestAttempt**: User test attempts with scores, completion status, and signature data

### Routing Structure  
- **App Router** with Next.js 15
- Main routes:
  - `app/(dashboard)/[[...node]]/` - Dynamic training routes with catch-all segments
  - `app/(dashboard)/profil/` - User profile page
  - `app/login/` - Authentication page with sign-in-view component
- API routes:
  - `/api/auth/[...nextauth]/` - NextAuth endpoints
  - `/api/trainings/` - Training modules API
  - `/api/trainings/[id]/test/` - Test retrieval and management
  - `/api/trainings/[id]/test/start/` - Start test attempt
  - `/api/test-attempts/[id]/submit/` - Submit test answers
  - `/api/trainings/by-code/[code]/` - Get training by employee code

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

## API Endpoints

### Training APIs
- **GET /api/trainings** - List all trainings
- **GET /api/trainings/[id]/content** - Get training content sections
- **GET /api/trainings/[id]/test** - Get test questions for a training
- **POST /api/trainings/[id]/test/start** - Start a new test attempt
- **GET /api/trainings/by-code/[code]** - Get training by employee code
- **GET /api/trainings/[id]/pdf** - Generate and download training content as PDF

### Test Management
- **POST /api/test-attempts/[id]/submit** - Submit test answers and calculate score

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
- Database: Microsoft SQL Server Express 2019 (local)
- Port: 1433 (default SQL Server port)
- Database name: AeroLMS
- Authentication: Windows Integrated Security
- Schema: `prisma/schema.prisma`
- Seed script: `prisma/seed.js`
- Migrations tracked in `prisma/migrations/`

### Tailwind Configuration
- Version 4.0 with PostCSS
- Animation utilities via `tailwindcss-animate`
- Custom theme variables in `app/theme.css`

## Environment Variables

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

## Important Reminders for Claude Code

- **Never create files** unless absolutely necessary for the task
- **Always prefer editing** existing files over creating new ones
- **Never proactively create** documentation files (*.md) unless explicitly requested
- **Use MCP tools** when available:
  - Context7 for library documentation
  - Playwright for browser testing
  - Magic for UI component generation
  - Sequential Thinking for complex problem solving
  - Shadcn UI v4 for getting latest shadcn/ui component source code
  - Basic Memory for persistent knowledge storage
- **Check existing patterns** before implementing new ones
- **Follow project conventions** for imports, naming, and structure