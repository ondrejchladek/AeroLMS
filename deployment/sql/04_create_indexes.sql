/*******************************************************************************
 * AeroLMS - Create Indexes Script
 *
 * Purpose: Create performance indexes on all tables
 * Safe: Uses IF NOT EXISTS pattern
 *
 * Indexes created for:
 *   - Foreign key columns (critical for joins)
 *   - Frequently queried columns
 *   - Sort/filter columns
 *
 * Run AFTER: 03_alter_user_table.sql
 ******************************************************************************/

SET NOCOUNT ON;

PRINT '========================================';
PRINT 'AeroLMS - Creating Indexes';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

BEGIN TRY
    DECLARE @IndexCount INT = 0;
    DECLARE @SkippedCount INT = 0;

    -- ============================================================================
    -- USER TABLE INDEXES
    -- ============================================================================
    PRINT '1. User table indexes...';
    PRINT '----------------------------------------';

    -- Index on role (for filtering)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_User_role')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_User_role] ON [dbo].[User]([role]);
        PRINT '  ✓ Created: IX_User_role';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_User_role (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- TRAINING TABLE INDEXES
    -- ============================================================================
    PRINT '2. Training table indexes...';
    PRINT '----------------------------------------';

    -- Already has unique index on code (from constraint)
    PRINT '  ✓ code column already has unique constraint index';

    PRINT '';

    -- ============================================================================
    -- TEST TABLE INDEXES
    -- ============================================================================
    PRINT '3. Test table indexes...';
    PRINT '----------------------------------------';

    -- Index on trainingId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Test_trainingId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Test_trainingId] ON [dbo].[Test]([trainingId]);
        PRINT '  ✓ Created: IX_Test_trainingId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Test_trainingId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on isActive (for filtering active tests)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Test_isActive')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Test_isActive] ON [dbo].[Test]([isActive]);
        PRINT '  ✓ Created: IX_Test_isActive';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Test_isActive (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Composite index on trainingId + isActive (common query)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Test_trainingId_isActive')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Test_trainingId_isActive]
        ON [dbo].[Test]([trainingId], [isActive]);
        PRINT '  ✓ Created: IX_Test_trainingId_isActive';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Test_trainingId_isActive (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- QUESTION TABLE INDEXES
    -- ============================================================================
    PRINT '4. Question table indexes...';
    PRINT '----------------------------------------';

    -- Index on testId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Question_testId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Question_testId] ON [dbo].[Question]([testId]);
        PRINT '  ✓ Created: IX_Question_testId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Question_testId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Composite index on testId + order (for ordered retrieval)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Question_testId_order')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Question_testId_order]
        ON [dbo].[Question]([testId], [order]);
        PRINT '  ✓ Created: IX_Question_testId_order';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Question_testId_order (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- TESTATTEMPT TABLE INDEXES
    -- ============================================================================
    PRINT '5. TestAttempt table indexes...';
    PRINT '----------------------------------------';

    -- Index on testId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_testId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_TestAttempt_testId] ON [dbo].[TestAttempt]([testId]);
        PRINT '  ✓ Created: IX_TestAttempt_testId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_TestAttempt_testId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on userId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_userId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_TestAttempt_userId] ON [dbo].[TestAttempt]([userId]);
        PRINT '  ✓ Created: IX_TestAttempt_userId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_TestAttempt_userId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on completedAt (for filtering completed vs in-progress)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_completedAt')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_TestAttempt_completedAt] ON [dbo].[TestAttempt]([completedAt]);
        PRINT '  ✓ Created: IX_TestAttempt_completedAt';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_TestAttempt_completedAt (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Composite index on userId + testId (for user-specific test history)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_userId_testId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_TestAttempt_userId_testId]
        ON [dbo].[TestAttempt]([userId], [testId]);
        PRINT '  ✓ Created: IX_TestAttempt_userId_testId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_TestAttempt_userId_testId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on createdAt (for ordering by creation time)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_createdAt')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_TestAttempt_createdAt]
        ON [dbo].[TestAttempt]([createdAt] DESC);
        PRINT '  ✓ Created: IX_TestAttempt_createdAt';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_TestAttempt_createdAt (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- CERTIFICATE TABLE INDEXES
    -- ============================================================================
    PRINT '6. Certificate table indexes...';
    PRINT '----------------------------------------';

    -- Index on userId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Certificate_userId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Certificate_userId] ON [dbo].[Certificate]([userId]);
        PRINT '  ✓ Created: IX_Certificate_userId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Certificate_userId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on trainingId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Certificate_trainingId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Certificate_trainingId] ON [dbo].[Certificate]([trainingId]);
        PRINT '  ✓ Created: IX_Certificate_trainingId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Certificate_trainingId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on validUntil (for filtering expiring certificates)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Certificate_validUntil')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Certificate_validUntil] ON [dbo].[Certificate]([validUntil]);
        PRINT '  ✓ Created: IX_Certificate_validUntil';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Certificate_validUntil (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on certificateNumber (for fast certificate lookup)
    -- Note: certificateNumber has UNIQUE constraint, but explicit index improves lookup performance
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Certificate_certificateNumber')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_Certificate_certificateNumber]
        ON [dbo].[Certificate]([certificateNumber]);
        PRINT '  ✓ Created: IX_Certificate_certificateNumber';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_Certificate_certificateNumber (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- TRAININGASSIGNMENT TABLE INDEXES
    -- ============================================================================
    PRINT '7. TrainingAssignment table indexes...';
    PRINT '----------------------------------------';

    -- Index on trainerId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TrainingAssignment_trainerId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_TrainingAssignment_trainerId]
        ON [dbo].[TrainingAssignment]([trainerId]);
        PRINT '  ✓ Created: IX_TrainingAssignment_trainerId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_TrainingAssignment_trainerId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on trainingId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TrainingAssignment_trainingId')
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_TrainingAssignment_trainingId]
        ON [dbo].[TrainingAssignment]([trainingId]);
        PRINT '  ✓ Created: IX_TrainingAssignment_trainingId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_TrainingAssignment_trainingId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Composite unique constraint already exists from table creation

    PRINT '';

    -- ============================================================================
    -- Summary
    -- ============================================================================
    PRINT '========================================';
    PRINT '✓ Index creation completed!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Summary:';
    PRINT '  - Indexes created: ' + CAST(@IndexCount AS VARCHAR);
    PRINT '  - Indexes skipped (already existed): ' + CAST(@SkippedCount AS VARCHAR);
    PRINT '';
    PRINT 'Database is now ready for AeroLMS deployment!';
    PRINT '';

END TRY
BEGIN CATCH
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();

    PRINT '';
    PRINT '========================================';
    PRINT '✗ ERROR during index creation!';
    PRINT '========================================';
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
