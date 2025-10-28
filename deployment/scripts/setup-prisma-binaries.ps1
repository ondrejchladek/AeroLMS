#******************************************************************************
# AeroLMS - Setup Prisma Binaries Script
#
# Purpose: Download and cache Prisma engine binaries for offline deployment
# Usage: Run this script on a machine with internet access
#
# This script will:
#   1. Detect the Prisma version from package.json
#   2. Download all required engine binaries
#   3. Cache them in .prisma-binaries folder
#   4. Create environment configuration file
#
# Run this BEFORE deploying to the offline server!
#******************************************************************************

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AeroLMS - Prisma Binaries Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the project root
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the AeroLMS project root." -ForegroundColor Red
    exit 1
}

# Read Prisma version from package.json
Write-Host "1. Detecting Prisma version..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$prismaVersion = $packageJson.devDependencies."prisma"

if (-not $prismaVersion) {
    Write-Host "ERROR: Prisma version not found in package.json!" -ForegroundColor Red
    exit 1
}

Write-Host "   Found Prisma version: $prismaVersion" -ForegroundColor Green
Write-Host ""

# Create .prisma-binaries directory
Write-Host "2. Creating .prisma-binaries directory..." -ForegroundColor Yellow
$binariesDir = ".prisma-binaries"

if (Test-Path $binariesDir) {
    Write-Host "   Directory already exists, cleaning..." -ForegroundColor Yellow
    Remove-Item -Path $binariesDir -Recurse -Force
}

New-Item -ItemType Directory -Path $binariesDir -Force | Out-Null
Write-Host "   Created: $binariesDir" -ForegroundColor Green
Write-Host ""

# Install dependencies and generate Prisma client
Write-Host "3. Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host ""

Write-Host "4. Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate --schema=.\prisma\schema.prisma
Write-Host ""

# Find the generated binaries
Write-Host "5. Locating Prisma engine binaries..." -ForegroundColor Yellow

$nodeModulesPath = "node_modules\.prisma\client"
$queryEnginePath = Get-ChildItem -Path $nodeModulesPath -Filter "libquery_engine-*.dll.node" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $queryEnginePath) {
    Write-Host "ERROR: Query engine binary not found!" -ForegroundColor Red
    Write-Host "Expected in: $nodeModulesPath" -ForegroundColor Red
    exit 1
}

Write-Host "   Found query engine: $($queryEnginePath.Name)" -ForegroundColor Green

# Copy query engine
Write-Host ""
Write-Host "6. Copying binaries to cache..." -ForegroundColor Yellow

Copy-Item -Path $queryEnginePath.FullName -Destination "$binariesDir\$($queryEnginePath.Name)" -Force
Write-Host "   Copied: $($queryEnginePath.Name)" -ForegroundColor Green

# Also look for schema engine
$globalPrismaPath = "$env:LOCALAPPDATA\Prisma\binaries"
if (Test-Path $globalPrismaPath) {
    $schemaEngines = Get-ChildItem -Path $globalPrismaPath -Filter "schema-engine-*.exe" -Recurse -ErrorAction SilentlyContinue
    if ($schemaEngines) {
        $latestSchema = $schemaEngines | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        Copy-Item -Path $latestSchema.FullName -Destination "$binariesDir\$($latestSchema.Name)" -Force
        Write-Host "   Copied: $($latestSchema.Name)" -ForegroundColor Green
    }
}

# Copy schema.prisma for reference
Copy-Item -Path "prisma\schema.prisma" -Destination "$binariesDir\schema.prisma" -Force
Write-Host "   Copied: schema.prisma (reference)" -ForegroundColor Green

Write-Host ""

# Create .env.binaries file with configuration
Write-Host "7. Creating environment configuration..." -ForegroundColor Yellow

$queryEngineName = $queryEnginePath.Name
$envContent = @"
# Prisma Engine Binaries Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Prisma Version: $prismaVersion

# Point Prisma to use local binaries instead of downloading
PRISMA_QUERY_ENGINE_LIBRARY=./.prisma-binaries/$queryEngineName

# Optional: Disable binary downloads
PRISMA_SKIP_POSTINSTALL_GENERATE=true
"@

$envContent | Out-File -FilePath "$binariesDir\.env.binaries" -Encoding UTF8
Write-Host "   Created: .env.binaries" -ForegroundColor Green

Write-Host ""

# Create .gitignore to ensure binaries are committed
Write-Host "8. Configuring Git..." -ForegroundColor Yellow

if (-not (Test-Path ".gitignore")) {
    New-Item -ItemType File -Path ".gitignore" -Force | Out-Null
}

$gitignoreContent = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue

if ($gitignoreContent -notlike "*# Allow Prisma binaries*") {
    Add-Content -Path ".gitignore" -Value @"

# Allow Prisma binaries for offline deployment
!.prisma-binaries/
!.prisma-binaries/**
"@
    Write-Host "   Updated .gitignore to allow .prisma-binaries" -ForegroundColor Green
} else {
    Write-Host "   .gitignore already configured" -ForegroundColor Green
}

Write-Host ""

# List cached files
Write-Host "9. Cached binaries:" -ForegroundColor Yellow
Get-ChildItem -Path $binariesDir | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1KB, 2)
    Write-Host "   - $($_.Name) ($sizeKB KB)" -ForegroundColor White
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Commit .prisma-binaries folder to Git:" -ForegroundColor White
Write-Host "     git add .prisma-binaries" -ForegroundColor Gray
Write-Host "     git commit -m 'Add Prisma binaries for offline deployment'" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. On the production server, add to .env.production:" -ForegroundColor White
Write-Host "     PRISMA_QUERY_ENGINE_LIBRARY=./.prisma-binaries/$queryEngineName" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Deploy and run:" -ForegroundColor White
Write-Host "     SET SKIP_POSTINSTALL=true" -ForegroundColor Gray
Write-Host "     npm install" -ForegroundColor Gray
Write-Host "     npx prisma generate" -ForegroundColor Gray
Write-Host ""
