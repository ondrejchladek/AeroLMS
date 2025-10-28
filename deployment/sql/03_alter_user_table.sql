/*******************************************************************************
 * AeroLMS - ALTER User Table Script
 *
 * Purpose: Safely add required columns to existing User table
 * Safe: Uses IF NOT EXISTS pattern for each column
 * Impact: MODIFIES PRODUCTION TABLE - BACKUP FIRST!
 *
 * Columns to add:
 *   - Application columns: code, name, role, email, password, etc.
 *   - Training columns: 33 training codes × 3 columns each = 99 columns
 *
 * Run AFTER: 02_create_new_tables.sql
 * Run BEFORE: 04_create_indexes.sql
 *
 * ⚠️ CRITICAL: CREATE FULL DATABASE BACKUP BEFORE RUNNING THIS SCRIPT!
 ******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON; -- Rollback entire transaction on error

PRINT '========================================';
PRINT 'AeroLMS - ALTER User Table';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';
PRINT '⚠️  WARNING: This script will modify the User table!';
PRINT '⚠️  Ensure you have a recent database backup!';
PRINT '';

-- Safety check: Confirm User table exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'User' AND TABLE_SCHEMA = 'dbo')
BEGIN
    PRINT '✗ ERROR: User table does not exist!';
    PRINT 'Cannot proceed with ALTER statements.';
    PRINT '';
    RAISERROR('User table not found', 16, 1);
    RETURN;
END

PRINT '✓ User table found, proceeding with column additions...';
PRINT '';

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @ColumnCount INT = 0;
    DECLARE @SkippedCount INT = 0;

    -- ============================================================================
    -- SECTION 1: Add Application Columns
    -- ============================================================================
    PRINT '1. Adding application columns...';
    PRINT '----------------------------------------';

    -- code (INT, NULL, UNIQUE)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME='code')
    BEGIN
        ALTER TABLE [dbo].[User] ADD [code] INT NULL;
        PRINT '  ✓ Added: code';
        SET @ColumnCount = @ColumnCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: code (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- name (NVARCHAR, NOT NULL but add as NULL first)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME='name')
    BEGIN
        ALTER TABLE [dbo].[User] ADD [name] NVARCHAR(1000) NULL;
        PRINT '  ✓ Added: name';
        SET @ColumnCount = @ColumnCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: name (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- role (NVARCHAR, default 'WORKER')
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME='role')
    BEGIN
        ALTER TABLE [dbo].[User] ADD [role] NVARCHAR(50) NULL CONSTRAINT [User_role_df] DEFAULT 'WORKER';
        PRINT '  ✓ Added: role';
        SET @ColumnCount = @ColumnCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: role (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- email (NVARCHAR, NULL, UNIQUE)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME='email')
    BEGIN
        ALTER TABLE [dbo].[User] ADD [email] NVARCHAR(255) NULL;
        PRINT '  ✓ Added: email';
        SET @ColumnCount = @ColumnCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: email (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- password (NVARCHAR, NULL - bcrypt hashes)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME='password')
    BEGIN
        ALTER TABLE [dbo].[User] ADD [password] NVARCHAR(255) NULL;
        PRINT '  ✓ Added: password';
        SET @ColumnCount = @ColumnCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: password (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- createdAt (DATETIME2, default CURRENT_TIMESTAMP)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME='createdAt')
    BEGIN
        ALTER TABLE [dbo].[User] ADD [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP;
        PRINT '  ✓ Added: createdAt';
        SET @ColumnCount = @ColumnCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: createdAt (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- updatedAt (DATETIME2, default CURRENT_TIMESTAMP)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='User' AND COLUMN_NAME='updatedAt')
    BEGIN
        ALTER TABLE [dbo].[User] ADD [updatedAt] DATETIME2 NOT NULL CONSTRAINT [User_updatedAt_df] DEFAULT CURRENT_TIMESTAMP;
        PRINT '  ✓ Added: updatedAt';
        SET @ColumnCount = @ColumnCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: updatedAt (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- SECTION 2: Add Training Columns (33 trainings × 3 columns = 99 columns)
    -- ============================================================================
    PRINT '2. Adding training columns (this may take a while)...';
    PRINT '----------------------------------------';

    -- Macro for adding training columns
    DECLARE @TrainingColumns TABLE (Code NVARCHAR(100));

    INSERT INTO @TrainingColumns VALUES
        ('CMM'), ('EDM'), ('EleZnaceni'), ('ITBezpecnost'), ('KnihaStroje'),
        ('KontrPrijZboz'), ('MerAVyhodOpotrebeni'), ('Meridla'), ('MonitorVyraCMTDilu'),
        ('NakladaniLatkami'), ('OpotrebeniNastrojuuCMT'), ('PouzitiNatsroju'),
        ('PozdavkyEN10204Dodak'), ('PraceKonProdukt'), ('Pruvodka'), ('RazK1K'),
        ('RegulacniKarty'), ('Samokontrol a'), ('SeriovaCisla'), ('SymbolyvBB'),
        ('SystemmanagemenntuKvalityCilepodniku'), ('TrideniOdpadu'),
        ('UdrzbaStrojuPracovnikyDilny'), ('VizualniKontrola'), ('VrtaniKritDily'),
        ('Vzorovani'), ('ZkouskaTvrdosti'), ('ZlomeniNastroje'), ('Znaceni');

    DECLARE @Code NVARCHAR(100);
    DECLARE @DatumPosl NVARCHAR(150);
    DECLARE @DatumPristi NVARCHAR(150);
    DECLARE @Pozadovano NVARCHAR(150);
    DECLARE @SQL NVARCHAR(MAX);

    DECLARE training_cursor CURSOR FOR SELECT Code FROM @TrainingColumns;
    OPEN training_cursor;

    FETCH NEXT FROM training_cursor INTO @Code;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @DatumPosl = @Code + 'DatumPosl';
        SET @DatumPristi = @Code + 'DatumPristi';
        SET @Pozadovano = @Code + 'Pozadovano';

        -- Add DatumPosl column
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                       WHERE TABLE_NAME='User' AND COLUMN_NAME=@DatumPosl)
        BEGIN
            SET @SQL = 'ALTER TABLE [dbo].[User] ADD [' + @DatumPosl + '] DATETIME2 NULL';
            EXEC sp_executesql @SQL;
            PRINT '  ✓ Added: ' + @DatumPosl;
            SET @ColumnCount = @ColumnCount + 1;
        END
        ELSE
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END

        -- Add DatumPristi column
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                       WHERE TABLE_NAME='User' AND COLUMN_NAME=@DatumPristi)
        BEGIN
            SET @SQL = 'ALTER TABLE [dbo].[User] ADD [' + @DatumPristi + '] DATETIME2 NULL';
            EXEC sp_executesql @SQL;
            PRINT '  ✓ Added: ' + @DatumPristi;
            SET @ColumnCount = @ColumnCount + 1;
        END
        ELSE
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END

        -- Add Pozadovano column
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                       WHERE TABLE_NAME='User' AND COLUMN_NAME=@Pozadovano)
        BEGIN
            SET @SQL = 'ALTER TABLE [dbo].[User] ADD [' + @Pozadovano + '] BIT NOT NULL DEFAULT 0';
            EXEC sp_executesql @SQL;
            PRINT '  ✓ Added: ' + @Pozadovano;
            SET @ColumnCount = @ColumnCount + 1;
        END
        ELSE
        BEGIN
            SET @SkippedCount = @SkippedCount + 1;
        END

        FETCH NEXT FROM training_cursor INTO @Code;
    END

    CLOSE training_cursor;
    DEALLOCATE training_cursor;

    PRINT '';

    -- ============================================================================
    -- SECTION 3: Add Unique Constraints (if columns were just created)
    -- ============================================================================
    PRINT '3. Adding unique constraints...';
    PRINT '----------------------------------------';

    -- Unique constraint on code
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                   WHERE CONSTRAINT_NAME='User_code_key')
    BEGIN
        ALTER TABLE [dbo].[User]
        ADD CONSTRAINT [User_code_key] UNIQUE ([code]);
        PRINT '  ✓ Added unique constraint: User_code_key';
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: User_code_key (already exists)';
    END

    -- Unique constraint on email
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                   WHERE CONSTRAINT_NAME='User_email_key')
    BEGIN
        ALTER TABLE [dbo].[User]
        ADD CONSTRAINT [User_email_key] UNIQUE ([email]);
        PRINT '  ✓ Added unique constraint: User_email_key';
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: User_email_key (already exists)';
    END

    PRINT '';

    -- ============================================================================
    -- Commit Transaction
    -- ============================================================================
    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✓ User table altered successfully!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Summary:';
    PRINT '  - Columns added: ' + CAST(@ColumnCount AS VARCHAR);
    PRINT '  - Columns skipped (already existed): ' + CAST(@SkippedCount AS VARCHAR);
    PRINT '';
    PRINT 'Next step: Run 04_create_indexes.sql';
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
        PRINT '';
        PRINT 'The User table has NOT been modified.';
        PRINT 'All changes have been rolled back.';
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
