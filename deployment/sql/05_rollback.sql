/*******************************************************************************
 * AeroLMS - ROLLBACK Script
 *
 * Purpose: Remove all AeroLMS tables and columns
 * DANGER: This will DELETE ALL AEROLMS DATA!
 *
 * ⚠️  CRITICAL WARNING ⚠️
 * This script will:
 *   - DROP all AeroLMS tables (Training, Test, Question, etc.)
 *   - REMOVE all AeroLMS columns from User table
 *   - DELETE all training data, test results, and certificates
 *
 * Use this script ONLY if:
 *   - Initial deployment fails and you need to start over
 *   - You need to completely uninstall AeroLMS
 *
 * DO NOT USE if you have production data you want to keep!
 * ALWAYS create a database backup before running!
 *
 ******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT '⚠️  AeroLMS ROLLBACK Script ⚠️';
PRINT '========================================';
PRINT '';
PRINT 'This script will remove ALL AeroLMS data!';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';
PRINT '⚠️  LAST CHANCE TO CANCEL!';
PRINT '⚠️  Press Ctrl+C to abort or wait 10 seconds to proceed...';
PRINT '';

-- Safety pause (comment out if running automated)
WAITFOR DELAY '00:00:10';

PRINT 'Proceeding with rollback...';
PRINT '';

BEGIN TRY
    BEGIN TRANSACTION;

    -- ============================================================================
    -- SECTION 1: Drop Foreign Key Constraints First
    -- ============================================================================
    PRINT '1. Dropping foreign key constraints...';
    PRINT '----------------------------------------';

    -- Drop FK on Test table
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='Test_trainingId_fkey')
    BEGIN
        ALTER TABLE [dbo].[Test] DROP CONSTRAINT [Test_trainingId_fkey];
        PRINT '  ✓ Dropped: Test_trainingId_fkey';
    END

    -- Drop FK on Question table
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='Question_testId_fkey')
    BEGIN
        ALTER TABLE [dbo].[Question] DROP CONSTRAINT [Question_testId_fkey];
        PRINT '  ✓ Dropped: Question_testId_fkey';
    END

    -- Drop FK on TestAttempt table
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='TestAttempt_testId_fkey')
    BEGIN
        ALTER TABLE [dbo].[TestAttempt] DROP CONSTRAINT [TestAttempt_testId_fkey];
        PRINT '  ✓ Dropped: TestAttempt_testId_fkey';
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='TestAttempt_userId_fkey')
    BEGIN
        ALTER TABLE [dbo].[TestAttempt] DROP CONSTRAINT [TestAttempt_userId_fkey];
        PRINT '  ✓ Dropped: TestAttempt_userId_fkey';
    END

    -- Drop FK on Certificate table
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='Certificate_userId_fkey')
    BEGIN
        ALTER TABLE [dbo].[Certificate] DROP CONSTRAINT [Certificate_userId_fkey];
        PRINT '  ✓ Dropped: Certificate_userId_fkey';
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='Certificate_trainingId_fkey')
    BEGIN
        ALTER TABLE [dbo].[Certificate] DROP CONSTRAINT [Certificate_trainingId_fkey];
        PRINT '  ✓ Dropped: Certificate_trainingId_fkey';
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='Certificate_testAttemptId_fkey')
    BEGIN
        ALTER TABLE [dbo].[Certificate] DROP CONSTRAINT [Certificate_testAttemptId_fkey];
        PRINT '  ✓ Dropped: Certificate_testAttemptId_fkey';
    END

    -- Drop FK on TrainingAssignment table
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='TrainingAssignment_trainerId_fkey')
    BEGIN
        ALTER TABLE [dbo].[TrainingAssignment] DROP CONSTRAINT [TrainingAssignment_trainerId_fkey];
        PRINT '  ✓ Dropped: TrainingAssignment_trainerId_fkey';
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='TrainingAssignment_trainingId_fkey')
    BEGIN
        ALTER TABLE [dbo].[TrainingAssignment] DROP CONSTRAINT [TrainingAssignment_trainingId_fkey];
        PRINT '  ✓ Dropped: TrainingAssignment_trainingId_fkey';
    END

    PRINT '';

    -- ============================================================================
    -- SECTION 2: Drop AeroLMS Tables
    -- ============================================================================
    PRINT '2. Dropping AeroLMS tables...';
    PRINT '----------------------------------------';

    IF OBJECT_ID('[dbo].[TrainingAssignment]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[TrainingAssignment];
        PRINT '  ✓ Dropped: TrainingAssignment';
    END

    IF OBJECT_ID('[dbo].[Certificate]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[Certificate];
        PRINT '  ✓ Dropped: Certificate';
    END

    IF OBJECT_ID('[dbo].[TestAttempt]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[TestAttempt];
        PRINT '  ✓ Dropped: TestAttempt';
    END

    IF OBJECT_ID('[dbo].[Question]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[Question];
        PRINT '  ✓ Dropped: Question';
    END

    IF OBJECT_ID('[dbo].[Test]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[Test];
        PRINT '  ✓ Dropped: Test';
    END

    IF OBJECT_ID('[dbo].[Training]', 'U') IS NOT NULL
    BEGIN
        DROP TABLE [dbo].[Training];
        PRINT '  ✓ Dropped: Training';
    END

    PRINT '';

    -- ============================================================================
    -- SECTION 3: Remove AeroLMS Columns from User Table (OPTIONAL - DANGEROUS!)
    -- ============================================================================
    PRINT '3. Removing AeroLMS columns from User table...';
    PRINT '----------------------------------------';
    PRINT '⚠️  WARNING: This will modify your User table!';
    PRINT '⚠️  This section is designed for LOCAL development rollback!';
    PRINT '⚠️  PRODUCTION database has training columns with _ prefix!';
    PRINT '⚠️  Comment out this section if you want to keep User table intact!';
    PRINT '';

    -- Uncomment the following code ONLY if you want to remove AeroLMS columns from User table
    /*
    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @ColumnName NVARCHAR(100);

    -- Drop unique constraints first
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='User_code_key')
    BEGIN
        ALTER TABLE [dbo].[User] DROP CONSTRAINT [User_code_key];
        PRINT '  ✓ Dropped constraint: User_code_key';
    END

    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
               WHERE CONSTRAINT_NAME='User_email_key')
    BEGIN
        ALTER TABLE [dbo].[User] DROP CONSTRAINT [User_email_key];
        PRINT '  ✓ Dropped constraint: User_email_key';
    END

    -- Drop application columns
    DECLARE @AppColumns TABLE (ColumnName NVARCHAR(100));
    INSERT INTO @AppColumns VALUES
        ('code'), ('name'), ('role'), ('email'), ('password'),
        ('createdAt'), ('updatedAt');

    DECLARE app_cursor CURSOR FOR SELECT ColumnName FROM @AppColumns;
    OPEN app_cursor;
    FETCH NEXT FROM app_cursor INTO @ColumnName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME=@ColumnName)
        BEGIN
            -- Drop default constraint first if exists
            DECLARE @ConstraintName NVARCHAR(200);
            SELECT @ConstraintName = d.name
            FROM sys.default_constraints d
            INNER JOIN sys.columns c ON d.parent_column_id = c.column_id
            WHERE d.parent_object_id = OBJECT_ID('User')
            AND c.name = @ColumnName;

            IF @ConstraintName IS NOT NULL
            BEGIN
                SET @SQL = 'ALTER TABLE [dbo].[User] DROP CONSTRAINT [' + @ConstraintName + ']';
                EXEC sp_executesql @SQL;
            END

            -- Drop column
            SET @SQL = 'ALTER TABLE [dbo].[User] DROP COLUMN [' + @ColumnName + ']';
            EXEC sp_executesql @SQL;
            PRINT '  ✓ Dropped column: ' + @ColumnName;
        END

        FETCH NEXT FROM app_cursor INTO @ColumnName;
    END

    CLOSE app_cursor;
    DEALLOCATE app_cursor;

    -- Drop training columns (DatumPosl, DatumPristi, Pozadovano)
    -- NOTE: For LOCAL development (columns WITHOUT _ prefix)
    -- For PRODUCTION (columns WITH _ prefix), modify column names below
    DECLARE @TrainingCodes TABLE (Code NVARCHAR(100));
    INSERT INTO @TrainingCodes VALUES
        ('CMM'), ('EDM'), ('EleZnaceni'), ('ITBezpecnost'), ('KnihaStroje'),
        ('KontrPrijZboz'), ('MerAVyhodOpotrebeni'), ('Meridla'), ('MonitorVyraCMTDilu'),
        ('NakladaniLatkami'), ('OpotrebeniNastrojuuCMT'), ('PouzitiNatsroju'),
        ('PozdavkyEN10204Dodak'), ('PraceKonProdukt'), ('Pruvodka'), ('RazK1K'),
        ('RegulacniKarty'), ('Samokontrol a'), ('SeriovaCisla'), ('SymbolyvBB'),
        ('SystemmanagemenntuKvalityCilepodniku'), ('TrideniOdpadu'),
        ('UdrzbaStrojuPracovnikyDilny'), ('VizualniKontrola'), ('VrtaniKritDily'),
        ('Vzorovani'), ('ZkouskaTvrdosti'), ('ZlomeniNastroje'), ('Znaceni');

    DECLARE @Code NVARCHAR(100);
    DECLARE training_cursor CURSOR FOR SELECT Code FROM @TrainingCodes;
    OPEN training_cursor;
    FETCH NEXT FROM training_cursor INTO @Code;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Drop DatumPosl
        SET @ColumnName = @Code + 'DatumPosl';
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME=@ColumnName)
        BEGIN
            SET @SQL = 'ALTER TABLE [dbo].[User] DROP COLUMN [' + @ColumnName + ']';
            EXEC sp_executesql @SQL;
        END

        -- Drop DatumPristi
        SET @ColumnName = @Code + 'DatumPristi';
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME=@ColumnName)
        BEGIN
            SET @SQL = 'ALTER TABLE [dbo].[User] DROP COLUMN [' + @ColumnName + ']';
            EXEC sp_executesql @SQL;
        END

        -- Drop Pozadovano (with default constraint)
        SET @ColumnName = @Code + 'Pozadovano';
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME=@ColumnName)
        BEGIN
            SET @SQL = 'ALTER TABLE [dbo].[User] DROP COLUMN [' + @ColumnName + ']';
            EXEC sp_executesql @SQL;
        END

        FETCH NEXT FROM training_cursor INTO @Code;
    END

    CLOSE training_cursor;
    DEALLOCATE training_cursor;

    PRINT '  ✓ All AeroLMS columns removed from User table';
    */

    PRINT '⚠️  User table column removal is COMMENTED OUT for safety';
    PRINT '    Uncomment Section 3 in script if you need to remove columns';
    PRINT '';

    -- ============================================================================
    -- Commit Transaction
    -- ============================================================================
    COMMIT TRANSACTION;

    PRINT '';
    PRINT '========================================';
    PRINT '✓ Rollback completed successfully!';
    PRINT '========================================';
    PRINT '';
    PRINT 'What was removed:';
    PRINT '  - All AeroLMS tables (Training, Test, Question, TestAttempt, Certificate, TrainingAssignment)';
    PRINT '  - All foreign key constraints';
    PRINT '  - All indexes (dropped with tables)';
    PRINT '';
    PRINT 'What was NOT removed:';
    PRINT '  - User table (still exists)';
    PRINT '  - AeroLMS columns in User table (uncomment Section 3 to remove)';
    PRINT '  - Existing user data (preserved)';
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

    -- Re-throw the error
    THROW;
END CATCH

SET NOCOUNT OFF;
