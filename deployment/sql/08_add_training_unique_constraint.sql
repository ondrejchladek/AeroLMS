/*******************************************************************************
 * AeroLMS - Enforce One Trainer Per Training Business Rule (PRODUCTION)
 *
 * Purpose: Add filtered unique index to enforce business rule at database level
 * Business Rule: Each training can have only ONE active trainer assigned
 *
 * WHAT THIS DOES:
 *   - Creates filtered unique index on trainingId WHERE deletedAt IS NULL
 *   - Prevents multiple active trainers for the same training
 *   - Allows multiple soft-deleted records (history preservation)
 *   - Protects against race conditions in concurrent requests
 *
 * PREREQUISITES:
 *   - InspiritTrainingAssignment table must exist (04_create_aerolms_tables.sql)
 *   - deletedAt column must exist (08_add_soft_delete_columns.sql)
 *   - Run on production: Helios003 database
 *
 * Run AFTER: 09_add_pdf_fields_to_assignment.sql
 ******************************************************************************/

USE Helios003;
GO

SET NOCOUNT ON;

PRINT '========================================';
PRINT 'AeroLMS - One Trainer Per Training Rule';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ============================================================================
-- STEP 1: Create filtered unique index
-- ============================================================================

PRINT 'Step 1: Creating filtered unique index...';
PRINT '----------------------------------------';

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_InspiritTrainingAssignment_trainingId_active'
    AND object_id = OBJECT_ID('InspiritTrainingAssignment')
)
BEGIN
    CREATE UNIQUE INDEX [IX_InspiritTrainingAssignment_trainingId_active]
    ON [dbo].[InspiritTrainingAssignment]([trainingId])
    WHERE [deletedAt] IS NULL;

    PRINT '✓ Created: IX_InspiritTrainingAssignment_trainingId_active';
    PRINT '';
    PRINT 'Index details:';
    PRINT '  - Column: trainingId';
    PRINT '  - Type: UNIQUE FILTERED';
    PRINT '  - Filter: WHERE deletedAt IS NULL';
    PRINT '  - Effect: Only ONE active trainer per training allowed';
END
ELSE
BEGIN
    PRINT '⚠️  Index already exists - skipping';
END

PRINT '';

-- ============================================================================
-- STEP 2: Verification
-- ============================================================================

PRINT 'Step 2: Verification...';
PRINT '----------------------------------------';

SELECT
    i.name AS [Index Name],
    i.type_desc AS [Type],
    i.is_unique AS [Is Unique],
    i.filter_definition AS [Filter]
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('InspiritTrainingAssignment')
AND i.name LIKE '%trainingId%';

PRINT '';
PRINT '========================================';
PRINT '✓ Done';
PRINT '========================================';
PRINT '';
GO

SET NOCOUNT OFF;
