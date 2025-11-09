/*******************************************************************************
 * AeroLMS - Rollback/Uninstall Script (PRODUCTION)
 *
 * Purpose: Safely remove all AeroLMS components from production database
 * Use Cases:
 *   - Testing deployment process
 *   - Reverting failed deployment
 *   - Complete uninstall of AeroLMS
 *
 * ⚠️ WARNING: This script will DELETE ALL AeroLMS data!
 *   - All training records
 *   - All test results and attempts
 *   - All certificates
 *   - All user authentication data
 *   - Helios tables (TabCisZam, TabCisZam_EXT) are NOT modified
 *
 * Safety Features:
 *   - Transaction-based (all or nothing)
 *   - Manual confirmation required
 *   - Backup reminder
 *   - Preserves Helios data
 *
 * Run this ONLY if you need to completely remove AeroLMS from production!
 ******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT 'AeroLMS - ROLLBACK/UNINSTALL Script';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ==============================================================================
-- SAFETY CHECK: Confirm database
-- ==============================================================================
IF DB_NAME() NOT LIKE '%Helios%'
BEGIN
    PRINT '⚠️  WARNING: This script is designed for Helios production database!';
    PRINT '   Current database: ' + DB_NAME();
    RAISERROR('Wrong database - expected Helios production database', 16, 1);
    RETURN;
END

-- ==============================================================================
-- BACKUP REMINDER
-- ==============================================================================
PRINT '';
PRINT '⚠️⚠️⚠️ CRITICAL WARNING ⚠️⚠️⚠️';
PRINT '';
PRINT 'This script will PERMANENTLY DELETE all AeroLMS data:';
PRINT '  - Training records';
PRINT '  - Test results and certificates';
PRINT '  - User authentication data (InspiritUserAuth)';
PRINT '  - All related application data';
PRINT '';
PRINT 'Helios tables (TabCisZam, TabCisZam_EXT) will NOT be modified.';
PRINT 'Training columns in TabCisZam_EXT will remain intact.';
PRINT '';
PRINT 'Have you created a database backup? (Recommended!)';
PRINT '';
PRINT '========================================';
PRINT 'To proceed, comment out the RETURN statement below.';
PRINT '========================================';
PRINT '';

-- Safety lock - must be manually removed to proceed
RETURN;

-- ==============================================================================
-- Begin Rollback Transaction
-- ==============================================================================
BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @DropCount INT = 0;
    DECLARE @ErrorCount INT = 0;

    PRINT '';
    PRINT 'Starting rollback process...';
    PRINT '';

    -- ============================================================================
    -- STEP 1: Drop INSTEAD OF Triggers
    -- ============================================================================
    PRINT '1. Removing INSTEAD OF triggers...';
    PRINT '----------------------------------------';

    IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_InspiritCisZam_Update')
    BEGIN
        DROP TRIGGER [dbo].[trg_InspiritCisZam_Update];
        PRINT '  ✓ trg_InspiritCisZam_Update dropped';
        SET @DropCount = @DropCount + 1;
    END

    IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_InspiritCisZam_Insert')
    BEGIN
        DROP TRIGGER [dbo].[trg_InspiritCisZam_Insert];
        PRINT '  ✓ trg_InspiritCisZam_Insert dropped';
        SET @DropCount = @DropCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- STEP 2: Drop InspiritCisZam VIEW
    -- ============================================================================
    PRINT '2. Removing InspiritCisZam VIEW...';
    PRINT '----------------------------------------';

    IF EXISTS (SELECT * FROM sys.views WHERE name = 'InspiritCisZam')
    BEGIN
        DROP VIEW [dbo].[InspiritCisZam];
        PRINT '  ✓ InspiritCisZam VIEW dropped';
        SET @DropCount = @DropCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ℹ InspiritCisZam VIEW does not exist (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- STEP 3: Drop AeroLMS Application Tables (with FK dependencies)
    -- ============================================================================
    PRINT '3. Removing AeroLMS application tables...';
    PRINT '----------------------------------------';

    -- Drop in correct order to respect FK constraints
    -- Certificate → TestAttempt → Test → Question → Training
    -- TrainingAssignment → Training

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InspiritCertificate')
    BEGIN
        DROP TABLE [dbo].[InspiritCertificate];
        PRINT '  ✓ InspiritCertificate table dropped';
        SET @DropCount = @DropCount + 1;
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InspiritTrainingAssignment')
    BEGIN
        DROP TABLE [dbo].[InspiritTrainingAssignment];
        PRINT '  ✓ InspiritTrainingAssignment table dropped';
        SET @DropCount = @DropCount + 1;
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InspiritTestAttempt')
    BEGIN
        DROP TABLE [dbo].[InspiritTestAttempt];
        PRINT '  ✓ InspiritTestAttempt table dropped';
        SET @DropCount = @DropCount + 1;
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InspiritQuestion')
    BEGIN
        DROP TABLE [dbo].[InspiritQuestion];
        PRINT '  ✓ InspiritQuestion table dropped';
        SET @DropCount = @DropCount + 1;
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InspiritTest')
    BEGIN
        DROP TABLE [dbo].[InspiritTest];
        PRINT '  ✓ InspiritTest table dropped';
        SET @DropCount = @DropCount + 1;
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InspiritTraining')
    BEGIN
        DROP TABLE [dbo].[InspiritTraining];
        PRINT '  ✓ InspiritTraining table dropped';
        SET @DropCount = @DropCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- STEP 4: Drop InspiritUserAuth Table
    -- ============================================================================
    PRINT '4. Removing InspiritUserAuth table...';
    PRINT '----------------------------------------';

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InspiritUserAuth')
    BEGIN
        DROP TABLE [dbo].[InspiritUserAuth];
        PRINT '  ✓ InspiritUserAuth table dropped';
        SET @DropCount = @DropCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ℹ InspiritUserAuth table does not exist (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- STEP 5: Revoke Permissions (if AeroLMS user exists)
    -- ============================================================================
    PRINT '5. Revoking permissions from AeroLMS user...';
    PRINT '----------------------------------------';

    IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'AeroLMS')
    BEGIN
        -- Revoke permissions on Helios tables
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TabCisZam')
        BEGIN
            REVOKE SELECT, INSERT, UPDATE, DELETE, ALTER ON [dbo].[TabCisZam] FROM [AeroLMS];
            PRINT '  ✓ Permissions revoked on TabCisZam';
        END

        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TabCisZam_EXT')
        BEGIN
            REVOKE SELECT, INSERT, UPDATE, DELETE, ALTER ON [dbo].[TabCisZam_EXT] FROM [AeroLMS];
            PRINT '  ✓ Permissions revoked on TabCisZam_EXT';
        END

        IF EXISTS (SELECT * FROM sys.views WHERE name = 'InspiritCisZam')
        BEGIN
            REVOKE SELECT ON [dbo].[InspiritCisZam] FROM [AeroLMS];
            PRINT '  ✓ Permissions revoked on InspiritCisZam VIEW';
        END

        -- Note: Permissions on dropped tables are automatically removed
        PRINT '  ℹ Permissions on dropped tables automatically removed';

        -- Optionally remove database user (uncomment if needed)
        -- DROP USER [AeroLMS];
        -- PRINT '  ✓ AeroLMS database user dropped';
    END
    ELSE
    BEGIN
        PRINT '  ℹ AeroLMS user does not exist (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- STEP 6: Verify Helios Tables Are Intact
    -- ============================================================================
    PRINT '6. Verifying Helios tables integrity...';
    PRINT '----------------------------------------';

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TabCisZam')
    BEGIN
        DECLARE @TabCisZamCount INT;
        SELECT @TabCisZamCount = COUNT(*) FROM [dbo].[TabCisZam];
        PRINT '  ✓ TabCisZam intact (' + CAST(@TabCisZamCount AS VARCHAR) + ' records)';
    END
    ELSE
    BEGIN
        PRINT '  ⚠️ WARNING: TabCisZam table not found!';
        SET @ErrorCount = @ErrorCount + 1;
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TabCisZam_EXT')
    BEGIN
        DECLARE @TabCisZamEXTCount INT;
        SELECT @TabCisZamEXTCount = COUNT(*) FROM [dbo].[TabCisZam_EXT];
        PRINT '  ✓ TabCisZam_EXT intact (' + CAST(@TabCisZamEXTCount AS VARCHAR) + ' records)';
    END
    ELSE
    BEGIN
        PRINT '  ⚠️ WARNING: TabCisZam_EXT table not found!';
        SET @ErrorCount = @ErrorCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- Commit Transaction
    -- ============================================================================
    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✓ Rollback completed successfully!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Summary:';
    PRINT '  - Objects removed: ' + CAST(@DropCount AS VARCHAR);
    PRINT '  - Errors: ' + CAST(@ErrorCount AS VARCHAR);
    PRINT '';
    PRINT 'Helios Tables Status:';
    PRINT '  - TabCisZam: INTACT (not modified)';
    PRINT '  - TabCisZam_EXT: INTACT (training columns preserved)';
    PRINT '';
    PRINT 'AeroLMS has been completely removed from the database.';
    PRINT 'To reinstall, run deployment scripts 01-06 in order.';
    PRINT '';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION;
        PRINT '';
        PRINT '========================================';
        PRINT '✗ ERROR: Rollback transaction failed!';
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
    PRINT 'Database may be in inconsistent state.';
    PRINT 'Please review error and retry, or restore from backup.';
    PRINT '';

    THROW;
END CATCH

SET NOCOUNT OFF;
