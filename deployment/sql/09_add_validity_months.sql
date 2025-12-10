-- ============================================================================
-- 09_add_validity_months.sql - Add configurable certificate validity per training
-- ============================================================================
--
-- CHANGE: Add validityMonths column to InspiritTraining table
-- PURPOSE: Allow per-training configuration of certificate validity (12-24 months)
-- DEFAULT: 12 months (1 year) to maintain backward compatibility
--
-- WHEN TO RUN: After all previous scripts (01-08) have been executed
-- IDEMPOTENT: Yes - safe to run multiple times
-- ROLLBACK: ALTER TABLE InspiritTraining DROP COLUMN validityMonths
--
-- ============================================================================

PRINT '=== Starting 09_add_validity_months.sql ===';
PRINT 'Adding validityMonths column to InspiritTraining table...';

-- Check if column already exists
IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('InspiritTraining')
    AND name = 'validityMonths'
)
BEGIN
    -- Add validityMonths column with default value of 12 months
    ALTER TABLE InspiritTraining
    ADD validityMonths INT NOT NULL DEFAULT 12;

    PRINT '✓ Added validityMonths column with default 12 months';
END
ELSE
BEGIN
    PRINT '→ Column validityMonths already exists - skipping';
END
GO

-- Verify the column was added correctly (separate batch after ALTER TABLE)
IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('InspiritTraining')
    AND name = 'validityMonths'
)
BEGIN
    PRINT '✓ Verification passed: validityMonths column exists';

    -- Show current training validity settings
    PRINT '';
    PRINT 'Current training validity settings:';
    SELECT
        code AS TrainingCode,
        name AS TrainingName,
        validityMonths AS ValidityMonths
    FROM InspiritTraining
    WHERE deletedAt IS NULL
    ORDER BY code;
END
ELSE
BEGIN
    PRINT '✗ ERROR: validityMonths column was not created!';
    THROW 51000, 'Failed to add validityMonths column to InspiritTraining', 1;
END

PRINT '';
PRINT '=== Completed 09_add_validity_months.sql ===';
GO
