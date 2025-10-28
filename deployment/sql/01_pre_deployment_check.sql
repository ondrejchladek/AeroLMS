/*******************************************************************************
 * AeroLMS - Pre-Deployment Check Script
 *
 * Purpose: Analyze existing database structure before deployment
 * Safe: READ-ONLY script, makes NO changes to database
 *
 * Run this script FIRST to understand what already exists in production DB
 ******************************************************************************/

SET NOCOUNT ON;

PRINT '========================================';
PRINT 'AeroLMS Pre-Deployment Check';
PRINT 'Database: ' + DB_NAME();
PRINT 'Server: ' + @@SERVERNAME;
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ==============================================================================
-- SECTION 1: Check if User table exists
-- ==============================================================================
PRINT '1. Checking User table...';
PRINT '----------------------------------------';

IF OBJECT_ID('[dbo].[User]', 'U') IS NOT NULL
BEGIN
    PRINT '✓ User table EXISTS';

    -- Get current structure
    PRINT '';
    PRINT 'Current User table structure:';
    SELECT
        COLUMN_NAME as [Column],
        DATA_TYPE as [Type],
        CHARACTER_MAXIMUM_LENGTH as [MaxLength],
        IS_NULLABLE as [Nullable],
        COLUMN_DEFAULT as [Default]
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'User' AND TABLE_SCHEMA = 'dbo'
    ORDER BY ORDINAL_POSITION;

    -- Count rows
    DECLARE @UserCount INT;
    SELECT @UserCount = COUNT(*) FROM [dbo].[User];
    PRINT '';
    PRINT 'Total users in table: ' + CAST(@UserCount AS VARCHAR);
END
ELSE
BEGIN
    PRINT '✗ User table DOES NOT EXIST (will be created)';
END

PRINT '';

-- ==============================================================================
-- SECTION 2: Check for required columns in User table
-- ==============================================================================
PRINT '2. Checking required columns for AeroLMS...';
PRINT '----------------------------------------';

DECLARE @RequiredColumns TABLE (
    ColumnName VARCHAR(100),
    Exists BIT
);

-- Application required columns
INSERT INTO @RequiredColumns (ColumnName, Exists)
VALUES
    ('UserID', 0),
    ('code', 0),
    ('name', 0),
    ('role', 0),
    ('email', 0),
    ('password', 0),
    ('createdAt', 0),
    ('updatedAt', 0);

-- Check which columns exist
UPDATE rc
SET rc.Exists = CASE WHEN c.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END
FROM @RequiredColumns rc
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
    ON c.TABLE_NAME = 'User'
    AND c.TABLE_SCHEMA = 'dbo'
    AND c.COLUMN_NAME = rc.ColumnName;

SELECT
    ColumnName as [Required Column],
    CASE WHEN Exists = 1 THEN '✓ EXISTS' ELSE '✗ MISSING (will be added)' END as [Status]
FROM @RequiredColumns
ORDER BY ColumnName;

PRINT '';

-- ==============================================================================
-- SECTION 3: Check for new tables that will be created
-- ==============================================================================
PRINT '3. Checking new tables...';
PRINT '----------------------------------------';

DECLARE @NewTables TABLE (
    TableName VARCHAR(100),
    Exists BIT
);

INSERT INTO @NewTables (TableName, Exists)
VALUES
    ('Training', 0),
    ('Test', 0),
    ('Question', 0),
    ('TestAttempt', 0),
    ('Certificate', 0),
    ('TrainingAssignment', 0);

-- Check which tables exist
UPDATE nt
SET nt.Exists = CASE WHEN t.TABLE_NAME IS NOT NULL THEN 1 ELSE 0 END
FROM @NewTables nt
LEFT JOIN INFORMATION_SCHEMA.TABLES t
    ON t.TABLE_NAME = nt.TableName
    AND t.TABLE_SCHEMA = 'dbo';

SELECT
    TableName as [Table],
    CASE WHEN Exists = 1 THEN '⚠ ALREADY EXISTS' ELSE '✓ Will be created' END as [Status]
FROM @NewTables
ORDER BY TableName;

PRINT '';

-- ==============================================================================
-- SECTION 4: Check for training-related columns in User table
-- ==============================================================================
PRINT '4. Detecting training columns in User table...';
PRINT '----------------------------------------';

IF OBJECT_ID('[dbo].[User]', 'U') IS NOT NULL
BEGIN
    -- Find all columns ending with DatumPosl, DatumPristi, or Pozadovano
    SELECT DISTINCT
        CASE
            WHEN COLUMN_NAME LIKE '%DatumPosl' THEN LEFT(COLUMN_NAME, LEN(COLUMN_NAME) - 9)
            WHEN COLUMN_NAME LIKE '%DatumPristi' THEN LEFT(COLUMN_NAME, LEN(COLUMN_NAME) - 11)
            WHEN COLUMN_NAME LIKE '%Pozadovano' THEN LEFT(COLUMN_NAME, LEN(COLUMN_NAME) - 10)
        END as [Training Code]
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'User'
      AND TABLE_SCHEMA = 'dbo'
      AND (
          COLUMN_NAME LIKE '%DatumPosl'
          OR COLUMN_NAME LIKE '%DatumPristi'
          OR COLUMN_NAME LIKE '%Pozadovano'
      )
    ORDER BY 1;

    DECLARE @TrainingCount INT;
    SELECT @TrainingCount = COUNT(DISTINCT
        CASE
            WHEN COLUMN_NAME LIKE '%DatumPosl' THEN LEFT(COLUMN_NAME, LEN(COLUMN_NAME) - 9)
            WHEN COLUMN_NAME LIKE '%DatumPristi' THEN LEFT(COLUMN_NAME, LEN(COLUMN_NAME) - 11)
            WHEN COLUMN_NAME LIKE '%Pozadovano' THEN LEFT(COLUMN_NAME, LEN(COLUMN_NAME) - 10)
        END)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'User'
      AND TABLE_SCHEMA = 'dbo'
      AND (
          COLUMN_NAME LIKE '%DatumPosl'
          OR COLUMN_NAME LIKE '%DatumPristi'
          OR COLUMN_NAME LIKE '%Pozadovano'
      );

    PRINT '';
    PRINT 'Total training codes detected: ' + CAST(@TrainingCount AS VARCHAR);
    PRINT '(These will auto-create Training records on first app start)';
END
ELSE
BEGIN
    PRINT 'User table does not exist yet.';
END

PRINT '';

-- ==============================================================================
-- SECTION 5: Summary and Recommendations
-- ==============================================================================
PRINT '';
PRINT '========================================';
PRINT 'SUMMARY & RECOMMENDATIONS';
PRINT '========================================';

DECLARE @UserTableExists BIT = CASE WHEN OBJECT_ID('[dbo].[User]', 'U') IS NOT NULL THEN 1 ELSE 0 END;
DECLARE @TrainingTableExists BIT = CASE WHEN OBJECT_ID('[dbo].[Training]', 'U') IS NOT NULL THEN 1 ELSE 0 END;

IF @UserTableExists = 1
BEGIN
    PRINT '✓ Production database detected (User table exists)';
    PRINT '  → Will use ALTER TABLE scripts to add new columns';
    PRINT '  → Existing data will be preserved';
    PRINT '  → BACKUP DATABASE BEFORE PROCEEDING!';
    PRINT '';
    PRINT 'Next steps:';
    PRINT '  1. Create full database backup';
    PRINT '  2. Run 02_create_new_tables.sql';
    PRINT '  3. Run 03_alter_user_table.sql';
    PRINT '  4. Run 04_create_indexes.sql';
END
ELSE
BEGIN
    PRINT '✓ New database detected (User table missing)';
    PRINT '  → Can use Prisma migrations or db push';
    PRINT '  → No data migration needed';
    PRINT '';
    PRINT 'Next steps:';
    PRINT '  1. Run: npx prisma db push';
    PRINT '  OR run all SQL scripts manually';
END

IF @TrainingTableExists = 1
BEGIN
    PRINT '';
    PRINT '⚠ WARNING: Training table already exists!';
    PRINT '  → Review 02_create_new_tables.sql carefully';
    PRINT '  → Some tables may need to be skipped';
END

PRINT '';
PRINT '========================================';
PRINT 'Pre-deployment check completed!';
PRINT '========================================';

SET NOCOUNT OFF;
