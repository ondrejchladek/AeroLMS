/*******************************************************************************
 * AeroLMS - Pre-Deployment Check Script (PRODUCTION)
 *
 * Purpose: Analyze existing production database structure before deployment
 * Safe: READ-ONLY script, makes NO changes to database
 *
 * Production Architecture:
 *   1. TabCisZam (Helios ERP, READ-ONLY): ID, Cislo, Alias, Jmeno, Prijmeni
 *   2. TabCisZam_EXT (Helios ERP, training columns): ID + _{code}DatumPosl/DatumPristi/Pozadovano
 *   3. InspiritCisZam VIEW (EXISTING): Combines TabCisZam + TabCisZam_EXT
 *   4. InspiritUserAuth TABLE (TO BE CREATED): ID, role, email, timestamps
 *
 * Run this script FIRST to understand what already exists in production DB
 ******************************************************************************/

USE Helios003;
GO

SET NOCOUNT ON;

PRINT '========================================';
PRINT 'AeroLMS Pre-Deployment Check';
PRINT 'Database: ' + DB_NAME();
PRINT 'Server: ' + @@SERVERNAME;
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ==============================================================================
-- SECTION 1: Check Helios ERP Tables (Must Exist, READ-ONLY)
-- ==============================================================================
PRINT '1. Checking Helios ERP tables...';
PRINT '----------------------------------------';

-- TabCisZam (Employee master data)
IF OBJECT_ID('[dbo].[TabCisZam]', 'U') IS NOT NULL
BEGIN
    PRINT '✓ TabCisZam table EXISTS (Helios ERP)';

    -- Verify required columns
    DECLARE @TabCisZamColumns TABLE (
        ColumnName VARCHAR(100),
        [Exists] BIT
    );

    INSERT INTO @TabCisZamColumns (ColumnName, [Exists])
    VALUES ('ID', 0), ('Cislo', 0), ('Alias', 0), ('Jmeno', 0), ('Prijmeni', 0);

    UPDATE tc
    SET tc.[Exists] = CASE WHEN c.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END
    FROM @TabCisZamColumns tc
    LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
        ON c.TABLE_NAME = 'TabCisZam'
        AND c.TABLE_SCHEMA = 'dbo'
        AND c.COLUMN_NAME = tc.ColumnName;

    PRINT '';
    PRINT '  Required columns:';
    SELECT '    ' + ColumnName + ': ' +
           CASE WHEN [Exists] = 1 THEN '✓' ELSE '✗ MISSING!' END as [Status]
    FROM @TabCisZamColumns;

    -- Count employees
    DECLARE @EmployeeCount INT;
    SELECT @EmployeeCount = COUNT(*) FROM [dbo].[TabCisZam];
    PRINT '';
    PRINT '  Total employees: ' + CAST(@EmployeeCount AS VARCHAR);
END
ELSE
BEGIN
    PRINT '✗ ERROR: TabCisZam table DOES NOT EXIST!';
    PRINT '  → This is a HELIOS ERP table, must exist before deployment';
    PRINT '  → STOP deployment and contact Helios administrator';
END

PRINT '';

-- TabCisZam_EXT (Training columns)
IF OBJECT_ID('[dbo].[TabCisZam_EXT]', 'U') IS NOT NULL
BEGIN
    PRINT '✓ TabCisZam_EXT table EXISTS (Helios ERP - Training data)';

    -- Verify FK relationship
    IF EXISTS (
        SELECT * FROM sys.foreign_keys
        WHERE parent_object_id = OBJECT_ID('[dbo].[TabCisZam_EXT]')
        AND referenced_object_id = OBJECT_ID('[dbo].[TabCisZam]')
    )
    BEGIN
        PRINT '  ✓ Foreign key to TabCisZam EXISTS (1:1 relationship)';
    END
    ELSE
    BEGIN
        PRINT '  ⚠ WARNING: Foreign key to TabCisZam MISSING!';
    END

    -- Count records
    DECLARE @ExtCount INT;
    SELECT @ExtCount = COUNT(*) FROM [dbo].[TabCisZam_EXT];
    PRINT '  Total records: ' + CAST(@ExtCount AS VARCHAR);

    -- Detect training columns
    PRINT '';
    PRINT '  Detecting training columns (_{code}DatumPosl/DatumPristi/Pozadovano):';

    SELECT DISTINCT
        REPLACE(REPLACE(REPLACE(REPLACE(
            COLUMN_NAME,
            '_', ''),
            'DatumPosl', ''),
            'DatumPristi', ''),
            'Pozadovano', '') as [Training Code]
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'TabCisZam_EXT'
      AND TABLE_SCHEMA = 'dbo'
      AND (
          COLUMN_NAME LIKE '\_%DatumPosl' ESCAPE '\'
          OR COLUMN_NAME LIKE '\_%DatumPristi' ESCAPE '\'
          OR COLUMN_NAME LIKE '\_%Pozadovano' ESCAPE '\'
      )
    ORDER BY 1;

    DECLARE @TrainingCount INT;
    SELECT @TrainingCount = COUNT(DISTINCT
        REPLACE(REPLACE(REPLACE(REPLACE(
            COLUMN_NAME,
            '_', ''),
            'DatumPosl', ''),
            'DatumPristi', ''),
            'Pozadovano', '')
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'TabCisZam_EXT'
      AND TABLE_SCHEMA = 'dbo'
      AND (
          COLUMN_NAME LIKE '\_%DatumPosl' ESCAPE '\'
          OR COLUMN_NAME LIKE '\_%DatumPristi' ESCAPE '\'
          OR COLUMN_NAME LIKE '\_%Pozadovano' ESCAPE '\'
      );

    PRINT '';
    PRINT '  Total training codes detected: ' + CAST(@TrainingCount AS VARCHAR);
    PRINT '  (These will auto-create Training records on first app start)';
END
ELSE
BEGIN
    PRINT '✗ ERROR: TabCisZam_EXT table DOES NOT EXIST!';
    PRINT '  → This is a HELIOS ERP table, must exist before deployment';
    PRINT '  → STOP deployment and contact Helios administrator';
END

PRINT '';

-- ==============================================================================
-- SECTION 2: Check InspiritCisZam VIEW (Should Already Exist)
-- ==============================================================================
PRINT '2. Checking InspiritCisZam VIEW...';
PRINT '----------------------------------------';

IF OBJECT_ID('[dbo].[InspiritCisZam]', 'V') IS NOT NULL
BEGIN
    PRINT '✓ InspiritCisZam VIEW EXISTS';
    PRINT '  → Script 03 will ALTER this view to add InspiritUserAuth columns';

    -- Check if view includes InspiritUserAuth columns (should NOT exist yet)
    IF EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.VIEW_COLUMN_USAGE
        WHERE VIEW_NAME = 'InspiritCisZam'
        AND TABLE_NAME = 'InspiritUserAuth'
    )
    BEGIN
        PRINT '  ℹ VIEW already includes InspiritUserAuth (deployment may have run before)';
    END
    ELSE
    BEGIN
        PRINT '  ✓ VIEW does NOT include InspiritUserAuth yet (expected)';
    END
END
ELSE
BEGIN
    PRINT '✗ WARNING: InspiritCisZam VIEW DOES NOT EXIST';
    PRINT '  → Expected to exist in production';
    PRINT '  → Script 03 will CREATE this view';
END

PRINT '';

-- ==============================================================================
-- SECTION 3: Check InspiritUserAuth TABLE (Should NOT Exist Yet)
-- ==============================================================================
PRINT '3. Checking InspiritUserAuth table...';
PRINT '----------------------------------------';

IF OBJECT_ID('[dbo].[InspiritUserAuth]', 'U') IS NOT NULL
BEGIN
    PRINT '⚠ InspiritUserAuth table ALREADY EXISTS';
    PRINT '  → Script 02 will skip creation';

    -- Count records
    DECLARE @AuthCount INT;
    SELECT @AuthCount = COUNT(*) FROM [dbo].[InspiritUserAuth];
    PRINT '  Total auth records: ' + CAST(@AuthCount AS VARCHAR);
END
ELSE
BEGIN
    PRINT '✓ InspiritUserAuth table DOES NOT EXIST (expected)';
    PRINT '  → Script 02 will create this table';
END

PRINT '';

-- ==============================================================================
-- SECTION 4: Check AeroLMS Application Tables (Should NOT Exist Yet)
-- ==============================================================================
PRINT '4. Checking AeroLMS application tables...';
PRINT '----------------------------------------';

DECLARE @AppTables TABLE (
    TableName VARCHAR(100),
    [Exists] BIT
);

INSERT INTO @AppTables (TableName, [Exists])
VALUES
    ('InspiritTraining', 0),
    ('InspiritTest', 0),
    ('InspiritQuestion', 0),
    ('InspiritTestAttempt', 0),
    ('InspiritCertificate', 0),
    ('InspiritTrainingAssignment', 0);

-- Check which tables exist
UPDATE at
SET at.[Exists] = CASE WHEN t.TABLE_NAME IS NOT NULL THEN 1 ELSE 0 END
FROM @AppTables at
LEFT JOIN INFORMATION_SCHEMA.TABLES t
    ON t.TABLE_NAME = at.TableName
    AND t.TABLE_SCHEMA = 'dbo';

SELECT
    TableName as [Table],
    CASE WHEN [Exists] = 1 THEN '⚠ ALREADY EXISTS' ELSE '✓ Will be created' END as [Status]
FROM @AppTables
ORDER BY TableName;

PRINT '';

-- ==============================================================================
-- SECTION 6: Summary and Recommendations
-- ==============================================================================
PRINT '';
PRINT '========================================';
PRINT 'SUMMARY & RECOMMENDATIONS';
PRINT '========================================';

DECLARE @TabCisZamExists BIT = CASE WHEN OBJECT_ID('[dbo].[TabCisZam]', 'U') IS NOT NULL THEN 1 ELSE 0 END;
DECLARE @TabCisZamEXTExists BIT = CASE WHEN OBJECT_ID('[dbo].[TabCisZam_EXT]', 'U') IS NOT NULL THEN 1 ELSE 0 END;
DECLARE @InspiritViewExists BIT = CASE WHEN OBJECT_ID('[dbo].[InspiritCisZam]', 'V') IS NOT NULL THEN 1 ELSE 0 END;
DECLARE @InspiritAuthExists BIT = CASE WHEN OBJECT_ID('[dbo].[InspiritUserAuth]', 'U') IS NOT NULL THEN 1 ELSE 0 END;

IF @TabCisZamExists = 1 AND @TabCisZamEXTExists = 1
BEGIN
    PRINT '✓ Helios ERP tables detected (production environment)';
    PRINT '';
    PRINT 'Prerequisites:';
    PRINT '  ✓ TabCisZam (employee master) - EXISTS';
    PRINT '  ✓ TabCisZam_EXT (training columns) - EXISTS';

    IF @InspiritViewExists = 1
        PRINT '  ✓ InspiritCisZam VIEW - EXISTS'
    ELSE
        PRINT '  ⚠ InspiritCisZam VIEW - MISSING (will be created)';

    IF @InspiritAuthExists = 0
        PRINT '  ✓ InspiritUserAuth TABLE - Does not exist (will be created)';
    ELSE
        PRINT '  ⚠ InspiritUserAuth TABLE - Already exists';

    PRINT '';
    PRINT '⚠ CRITICAL: Helios tables are READ-ONLY for AeroLMS!';
    PRINT '  → TabCisZam: NO modifications allowed';
    PRINT '  → TabCisZam_EXT: Only UPDATE on training columns (via app)';
    PRINT '';
    PRINT 'Next steps:';
    PRINT '  1. CREATE FULL DATABASE BACKUP!';
    PRINT '  2. Run 02_create_inspirit_tables.sql (creates InspiritUserAuth)';
    PRINT '  3. Run 03_create_inspirit_view.sql (creates/alters VIEW and triggers)';
    PRINT '  4. Run 04_create_aerolms_tables.sql (creates app tables)';
    PRINT '  5. Run 05_create_indexes.sql (performance indexes)';
    PRINT '  6. Run 06_set_permissions.sql (database security)';
END
ELSE
BEGIN
    PRINT '✗ ERROR: Helios ERP tables NOT found!';
    PRINT '  → TabCisZam: ' + CASE WHEN @TabCisZamExists = 1 THEN 'EXISTS' ELSE 'MISSING!' END;
    PRINT '  → TabCisZam_EXT: ' + CASE WHEN @TabCisZamEXTExists = 1 THEN 'EXISTS' ELSE 'MISSING!' END;
    PRINT '';
    PRINT '⚠ DEPLOYMENT CANNOT PROCEED!';
    PRINT '  → Contact Helios ERP administrator';
    PRINT '  → These tables must exist before AeroLMS deployment';
END

PRINT '';
PRINT '========================================';
PRINT 'Pre-deployment check completed!';
PRINT '========================================';
PRINT '';

SET NOCOUNT OFF;
