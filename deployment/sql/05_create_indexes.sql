/*******************************************************************************
 * AeroLMS - Create Indexes Script (PRODUCTION)
 *
 * Purpose: Create performance indexes on all AeroLMS tables
 * Safe: Uses IF NOT EXISTS pattern
 *
 * Indexes created for:
 *   - InspiritUserAuth (authentication table)
 *   - Foreign key columns (critical for joins)
 *   - Frequently queried columns
 *   - Sort/filter columns
 *
 * Run AFTER: 04_create_aerolms_tables.sql
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
    -- INSPIRIT USERAUTH TABLE INDEXES
    -- ============================================================================
    PRINT '1. InspiritUserAuth table indexes...';
    PRINT '----------------------------------------';

    -- Index on role (for filtering by role)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritUserAuth_role' AND object_id = OBJECT_ID('InspiritUserAuth'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritUserAuth_role] ON [dbo].[InspiritUserAuth]([role]);
        PRINT '  ✓ Created: IX_InspiritUserAuth_role';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritUserAuth_role (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Note: email already has UNIQUE constraint (automatic index)
    PRINT '  ✓ email already has unique constraint index';

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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Test_trainingId' AND object_id = OBJECT_ID('Test'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Test_isActive' AND object_id = OBJECT_ID('Test'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Test_trainingId_isActive' AND object_id = OBJECT_ID('Test'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Question_testId' AND object_id = OBJECT_ID('Question'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Question_testId_order' AND object_id = OBJECT_ID('Question'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_testId' AND object_id = OBJECT_ID('TestAttempt'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_userId' AND object_id = OBJECT_ID('TestAttempt'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_completedAt' AND object_id = OBJECT_ID('TestAttempt'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_userId_testId' AND object_id = OBJECT_ID('TestAttempt'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TestAttempt_createdAt' AND object_id = OBJECT_ID('TestAttempt'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Certificate_userId' AND object_id = OBJECT_ID('Certificate'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Certificate_trainingId' AND object_id = OBJECT_ID('Certificate'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_Certificate_validUntil' AND object_id = OBJECT_ID('Certificate'))
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

    -- Note: certificateNumber has UNIQUE constraint (automatic index)
    PRINT '  ✓ certificateNumber already has unique constraint index';

    PRINT '';

    -- ============================================================================
    -- TRAININGASSIGNMENT TABLE INDEXES
    -- ============================================================================
    PRINT '7. TrainingAssignment table indexes...';
    PRINT '----------------------------------------';

    -- Index on trainerId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TrainingAssignment_trainerId' AND object_id = OBJECT_ID('TrainingAssignment'))
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_TrainingAssignment_trainingId' AND object_id = OBJECT_ID('TrainingAssignment'))
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
