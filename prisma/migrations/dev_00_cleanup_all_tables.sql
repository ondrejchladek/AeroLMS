/*******************************************************************************
 * AeroLMS - Development: Complete Database Cleanup
 *
 * Purpose: Drop all AeroLMS tables to start fresh with new architecture
 * Environment: DEVELOPMENT ONLY (Local SQL Server Express - AeroLMS database)
 *
 * This script drops ALL AeroLMS tables in correct order (respecting FK constraints)
 *
 * Run BEFORE: All other dev scripts
 ******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT 'AeroLMS Development - Complete Database Cleanup';
PRINT 'Database: ' + DB_NAME();
PRINT 'Server: ' + @@SERVERNAME;
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- Safety Check: Prevent running on production
IF DB_NAME() LIKE '%Helios%'
BEGIN
    PRINT '⚠️  ERROR: This is a DEVELOPMENT script!';
    PRINT '   Do NOT run on Helios production database!';
    RAISERROR('Cannot run dev script on production database', 16, 1);
    RETURN;
END

BEGIN TRY
    BEGIN TRANSACTION;

    PRINT 'Dropping all AeroLMS tables...';
    PRINT '----------------------------------------';

    -- Drop in correct order (child tables first, then parent tables)

    -- 1. Drop TrainingAssignment (references User and Training)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TrainingAssignment')
    BEGIN
        DROP TABLE [TrainingAssignment];
        PRINT '✓ Dropped: TrainingAssignment';
    END

    -- 2. Drop Certificate (references User and Training)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Certificate')
    BEGIN
        DROP TABLE [Certificate];
        PRINT '✓ Dropped: Certificate';
    END

    -- 3. Drop TestAttempt (references User and Test)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TestAttempt')
    BEGIN
        DROP TABLE [TestAttempt];
        PRINT '✓ Dropped: TestAttempt';
    END

    -- 4. Drop Question (references Test)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Question')
    BEGIN
        DROP TABLE [Question];
        PRINT '✓ Dropped: Question';
    END

    -- 5. Drop Test (references Training)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Test')
    BEGIN
        DROP TABLE [Test];
        PRINT '✓ Dropped: Test';
    END

    -- 6. Drop Training (no dependencies)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Training')
    BEGIN
        DROP TABLE [Training];
        PRINT '✓ Dropped: Training';
    END

    -- 7. Drop User (or SYNONYM if it exists)
    IF EXISTS (SELECT * FROM sys.synonyms WHERE name = 'User')
    BEGIN
        DROP SYNONYM [User];
        PRINT '✓ Dropped: User SYNONYM';
    END
    ELSE IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'User')
    BEGIN
        DROP TABLE [User];
        PRINT '✓ Dropped: User table';
    END

    -- 8. Drop InspiritCisZam VIEW and triggers (if exist)
    IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_InspiritCisZam_Insert')
    BEGIN
        DROP TRIGGER [trg_InspiritCisZam_Insert];
        PRINT '✓ Dropped: trg_InspiritCisZam_Insert trigger';
    END

    IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_InspiritCisZam_Update')
    BEGIN
        DROP TRIGGER [trg_InspiritCisZam_Update];
        PRINT '✓ Dropped: trg_InspiritCisZam_Update trigger';
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = 'InspiritCisZam')
    BEGIN
        DROP VIEW [InspiritCisZam];
        PRINT '✓ Dropped: InspiritCisZam VIEW';
    END

    -- 9. Drop InspiritUserAuth (if exists)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InspiritUserAuth')
    BEGIN
        DROP TABLE [InspiritUserAuth];
        PRINT '✓ Dropped: InspiritUserAuth';
    END

    -- 10. Drop TabCisZam_EXT (if exists)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TabCisZam_EXT')
    BEGIN
        DROP TABLE [TabCisZam_EXT];
        PRINT '✓ Dropped: TabCisZam_EXT';
    END

    -- 11. Drop TabCisZam (if exists)
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TabCisZam')
    BEGIN
        DROP TABLE [TabCisZam];
        PRINT '✓ Dropped: TabCisZam';
    END

    PRINT '';

    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✓ Complete database cleanup successful!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Database is now empty and ready for fresh setup.';
    PRINT '';
    PRINT 'Next steps (run in order):';
    PRINT '  1. dev_01_create_helios_tables.sql';
    PRINT '  2. dev_02_create_inspirit_tables.sql';
    PRINT '  3. dev_03_create_inspirit_view.sql';
    PRINT '  4. dev_04_create_aerolms_tables.sql';
    PRINT '  5. Seed data (prisma/seed.js)';
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

    THROW;
END CATCH

SET NOCOUNT OFF;
