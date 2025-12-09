-- ============================================================================
-- 09_add_pdf_fields_to_assignment.sql
-- Enterprise-grade: PDF document support for training assignments
--
-- PURPOSE:
--   Adds PDF file metadata fields to InspiritTrainingAssignment table
--   Enables trainers to upload PDF documents for their assigned trainings
--
-- PREREQUISITES:
--   - InspiritTrainingAssignment table must exist (04_create_aerolms_tables.sql)
--   - Run on production: Helios003 database
--
-- ROLLBACK:
--   See bottom of file for rollback commands
-- ============================================================================

USE [Helios003];
GO

-- ============================================================================
-- STEP 1: Add PDF columns to InspiritTrainingAssignment
-- ============================================================================

PRINT 'Adding PDF columns to InspiritTrainingAssignment...';

-- Check if columns already exist before adding
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'InspiritTrainingAssignment'
    AND COLUMN_NAME = 'pdfFileName'
)
BEGIN
    ALTER TABLE [InspiritTrainingAssignment]
    ADD [pdfFileName] NVARCHAR(255) NULL;
    PRINT '  Added column: pdfFileName';
END
ELSE
BEGIN
    PRINT '  Column pdfFileName already exists - skipping';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'InspiritTrainingAssignment'
    AND COLUMN_NAME = 'pdfOriginalName'
)
BEGIN
    ALTER TABLE [InspiritTrainingAssignment]
    ADD [pdfOriginalName] NVARCHAR(500) NULL;
    PRINT '  Added column: pdfOriginalName';
END
ELSE
BEGIN
    PRINT '  Column pdfOriginalName already exists - skipping';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'InspiritTrainingAssignment'
    AND COLUMN_NAME = 'pdfFileSize'
)
BEGIN
    ALTER TABLE [InspiritTrainingAssignment]
    ADD [pdfFileSize] BIGINT NULL;
    PRINT '  Added column: pdfFileSize';
END
ELSE
BEGIN
    PRINT '  Column pdfFileSize already exists - skipping';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'InspiritTrainingAssignment'
    AND COLUMN_NAME = 'pdfMimeType'
)
BEGIN
    ALTER TABLE [InspiritTrainingAssignment]
    ADD [pdfMimeType] NVARCHAR(100) NULL;
    PRINT '  Added column: pdfMimeType';
END
ELSE
BEGIN
    PRINT '  Column pdfMimeType already exists - skipping';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'InspiritTrainingAssignment'
    AND COLUMN_NAME = 'pdfUploadedAt'
)
BEGIN
    ALTER TABLE [InspiritTrainingAssignment]
    ADD [pdfUploadedAt] DATETIME2 NULL;
    PRINT '  Added column: pdfUploadedAt';
END
ELSE
BEGIN
    PRINT '  Column pdfUploadedAt already exists - skipping';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'InspiritTrainingAssignment'
    AND COLUMN_NAME = 'pdfUploadedBy'
)
BEGIN
    ALTER TABLE [InspiritTrainingAssignment]
    ADD [pdfUploadedBy] INT NULL;
    PRINT '  Added column: pdfUploadedBy';
END
ELSE
BEGIN
    PRINT '  Column pdfUploadedBy already exists - skipping';
END
GO

-- ============================================================================
-- STEP 2: Create index for audit queries
-- ============================================================================

PRINT 'Creating index for pdfUploadedBy...';

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_InspiritTrainingAssignment_pdfUploadedBy'
    AND object_id = OBJECT_ID('InspiritTrainingAssignment')
)
BEGIN
    CREATE INDEX [IX_InspiritTrainingAssignment_pdfUploadedBy]
    ON [InspiritTrainingAssignment]([pdfUploadedBy])
    WHERE [pdfUploadedBy] IS NOT NULL;
    PRINT '  Created index: IX_InspiritTrainingAssignment_pdfUploadedBy';
END
ELSE
BEGIN
    PRINT '  Index IX_InspiritTrainingAssignment_pdfUploadedBy already exists - skipping';
END
GO

-- ============================================================================
-- STEP 3: Verify migration
-- ============================================================================

PRINT '';
PRINT 'Verification - InspiritTrainingAssignment PDF columns:';

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'InspiritTrainingAssignment'
AND COLUMN_NAME LIKE 'pdf%'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '09_add_pdf_fields_to_assignment.sql completed successfully!';
GO

-- ============================================================================
-- ROLLBACK COMMANDS (if needed)
-- ============================================================================
/*
-- WARNING: This will permanently delete all PDF metadata!
-- Make sure to delete physical files first from C:\AeroLMSFiles

USE [Helios003];
GO

-- Drop index first
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_InspiritTrainingAssignment_pdfUploadedBy'
)
BEGIN
    DROP INDEX [IX_InspiritTrainingAssignment_pdfUploadedBy]
    ON [InspiritTrainingAssignment];
    PRINT 'Dropped index: IX_InspiritTrainingAssignment_pdfUploadedBy';
END
GO

-- Drop columns
ALTER TABLE [InspiritTrainingAssignment]
DROP COLUMN IF EXISTS [pdfFileName],
                      [pdfOriginalName],
                      [pdfFileSize],
                      [pdfMimeType],
                      [pdfUploadedAt],
                      [pdfUploadedBy];

PRINT 'Dropped PDF columns from InspiritTrainingAssignment';
GO
*/
