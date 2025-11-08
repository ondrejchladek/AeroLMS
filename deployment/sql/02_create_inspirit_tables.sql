/*******************************************************************************
 * AeroLMS - Create Inspirit Tables Script (PRODUCTION)
 *
 * Purpose: Create InspiritUserAuth table for authentication data
 * Environment: PRODUCTION ONLY (Corporate SQL Server - Helios003)
 * Safe: Uses IF NOT EXISTS pattern, creates FK to existing TabCisZam
 *
 * Database Context:
 *   - TabCisZam: Employee master data (Helios system, READ-ONLY)
 *   - TabCisZam_EXT: Training data (Helios system, UPDATE training columns only)
 *   - InspiritUserAuth: AeroLMS authentication data (NEW - created by this script)
 *
 * Run AFTER: 01_pre_deployment_check.sql
 * Run BEFORE: 03_create_inspirit_view.sql
 *
 * ⚠️ CRITICAL: This script is for PRODUCTION deployment only!
 *              For local development, use Prisma migrations instead.
 ******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON; -- Rollback entire transaction on error

PRINT '========================================';
PRINT 'AeroLMS - Creating Inspirit Tables';
PRINT 'Database: ' + DB_NAME();
PRINT 'Server: ' + @@SERVERNAME;
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ==============================================================================
-- Safety Check: Verify we're in production environment
-- ==============================================================================
IF DB_NAME() NOT LIKE '%Helios%'
BEGIN
    PRINT '⚠️  WARNING: This script is designed for Helios database!';
    PRINT '   Current database: ' + DB_NAME();
    PRINT '';
    PRINT '   For local development, use:';
    PRINT '   > npx prisma db push';
    PRINT '';
    RAISERROR('Wrong database - expected Helios production database', 16, 1);
    RETURN;
END

-- ==============================================================================
-- Safety Check: Verify required tables exist
-- ==============================================================================
PRINT 'Verifying required Helios tables...';
PRINT '----------------------------------------';

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'TabCisZam' AND TABLE_SCHEMA = 'dbo')
BEGIN
    PRINT '✗ ERROR: TabCisZam table not found!';
    PRINT '  This table should exist in Helios database.';
    RAISERROR('Required table TabCisZam not found', 16, 1);
    RETURN;
END
PRINT '✓ TabCisZam found';

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'TabCisZam_EXT' AND TABLE_SCHEMA = 'dbo')
BEGIN
    PRINT '✗ ERROR: TabCisZam_EXT table not found!';
    PRINT '  This table should exist in Helios database.';
    RAISERROR('Required table TabCisZam_EXT not found', 16, 1);
    RETURN;
END
PRINT '✓ TabCisZam_EXT found';

PRINT '';

BEGIN TRY
    BEGIN TRANSACTION;

    -- ============================================================================
    -- TABLE: InspiritUserAuth
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritUserAuth' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating InspiritUserAuth table...';
        PRINT '----------------------------------------';

        CREATE TABLE [dbo].[InspiritUserAuth] (
            -- Primary key: Same as TabCisZam.ID (1:1 relationship)
            [ID] INT NOT NULL,

            -- Authentication fields
            [role] NVARCHAR(50) NOT NULL DEFAULT 'WORKER', -- ADMIN | TRAINER | WORKER
            [email] NVARCHAR(255) NULL,               -- Email for admin/trainer login (optional)

            -- Audit timestamps
            [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,

            -- Constraints
            CONSTRAINT [InspiritUserAuth_pkey] PRIMARY KEY CLUSTERED ([ID]),
            CONSTRAINT [InspiritUserAuth_email_key] UNIQUE NONCLUSTERED ([email]),

            -- Foreign key to Helios employee table
            CONSTRAINT [InspiritUserAuth_TabCisZam_fkey]
                FOREIGN KEY ([ID])
                REFERENCES [dbo].[TabCisZam]([ID])
                ON DELETE CASCADE
                ON UPDATE NO ACTION
        );

        PRINT '✓ InspiritUserAuth table created';
        PRINT '';
        PRINT 'Table structure:';
        PRINT '  - ID: INT (FK to TabCisZam.ID)';
        PRINT '  - role: NVARCHAR(50) (ADMIN|TRAINER|WORKER)';
        PRINT '  - email: NVARCHAR(255) (unique, optional for email login)';
        PRINT '  - createdAt, updatedAt: DATETIME2';
        PRINT '';
        PRINT 'Authentication data:';
        PRINT '  - Cislo (personal code): From TabCisZam.Cislo';
        PRINT '  - Alias (password): From TabCisZam.Alias';
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT '⚠️  InspiritUserAuth table already exists (skipped)';
        PRINT '';
    END

    -- ============================================================================
    -- Commit Transaction
    -- ============================================================================
    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✓ Inspirit tables created successfully!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Next step: Run 03_create_inspirit_view.sql';
    PRINT '';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION;
        PRINT '';
        PRINT '========================================';
        PRINT '✗ ERROR: Transaction rolled back!';
        PRINT '========================================';
    END

    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();

    PRINT '';
    PRINT 'Error Details:';
    PRINT '  Message: ' + @ErrorMessage;
    PRINT '  Severity: ' + CAST(@ErrorSeverity AS VARCHAR);
    PRINT '  State: ' + CAST(@ErrorState AS VARCHAR);
    PRINT '';

    -- Re-throw the error
    THROW;
END CATCH

SET NOCOUNT OFF;
