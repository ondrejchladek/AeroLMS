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
    PRINT '2. InspiritTraining table indexes...';
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
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTest_trainingId' AND object_id = OBJECT_ID('InspiritTest'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTest_trainingId] ON [dbo].[InspiritTest]([trainingId]);
        PRINT '  ✓ Created: IX_InspiritTest_trainingId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTest_trainingId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on isActive (for filtering active tests)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTest_isActive' AND object_id = OBJECT_ID('InspiritTest'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTest_isActive] ON [dbo].[InspiritTest]([isActive]);
        PRINT '  ✓ Created: IX_InspiritTest_isActive';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTest_isActive (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Composite index on trainingId + isActive (common query)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTest_trainingId_isActive' AND object_id = OBJECT_ID('InspiritTest'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTest_trainingId_isActive]
        ON [dbo].[InspiritTest]([trainingId], [isActive]);
        PRINT '  ✓ Created: IX_InspiritTest_trainingId_isActive';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTest_trainingId_isActive (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- QUESTION TABLE INDEXES
    -- ============================================================================
    PRINT '4. Question table indexes...';
    PRINT '----------------------------------------';

    -- Index on testId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritQuestion_testId' AND object_id = OBJECT_ID('InspiritQuestion'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritQuestion_testId] ON [dbo].[InspiritQuestion]([testId]);
        PRINT '  ✓ Created: IX_InspiritQuestion_testId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritQuestion_testId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Composite index on testId + order (for ordered retrieval)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritQuestion_testId_order' AND object_id = OBJECT_ID('InspiritQuestion'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritQuestion_testId_order]
        ON [dbo].[InspiritQuestion]([testId], [order]);
        PRINT '  ✓ Created: IX_InspiritQuestion_testId_order';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritQuestion_testId_order (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- TESTATTEMPT TABLE INDEXES
    -- ============================================================================
    PRINT '5. TestAttempt table indexes...';
    PRINT '----------------------------------------';

    -- Index on testId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTestAttempt_testId' AND object_id = OBJECT_ID('InspiritTestAttempt'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTestAttempt_testId] ON [dbo].[InspiritTestAttempt]([testId]);
        PRINT '  ✓ Created: IX_InspiritTestAttempt_testId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTestAttempt_testId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on userId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTestAttempt_userId' AND object_id = OBJECT_ID('InspiritTestAttempt'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTestAttempt_userId] ON [dbo].[InspiritTestAttempt]([userId]);
        PRINT '  ✓ Created: IX_InspiritTestAttempt_userId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTestAttempt_userId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on completedAt (for filtering completed vs in-progress)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTestAttempt_completedAt' AND object_id = OBJECT_ID('InspiritTestAttempt'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTestAttempt_completedAt] ON [dbo].[InspiritTestAttempt]([completedAt]);
        PRINT '  ✓ Created: IX_InspiritTestAttempt_completedAt';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTestAttempt_completedAt (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Composite index on userId + testId (for user-specific test history)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTestAttempt_userId_testId' AND object_id = OBJECT_ID('InspiritTestAttempt'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTestAttempt_userId_testId]
        ON [dbo].[InspiritTestAttempt]([userId], [testId]);
        PRINT '  ✓ Created: IX_InspiritTestAttempt_userId_testId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTestAttempt_userId_testId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on createdAt (for ordering by creation time)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTestAttempt_createdAt' AND object_id = OBJECT_ID('InspiritTestAttempt'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTestAttempt_createdAt]
        ON [dbo].[InspiritTestAttempt]([createdAt] DESC);
        PRINT '  ✓ Created: IX_InspiritTestAttempt_createdAt';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTestAttempt_createdAt (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    PRINT '';

    -- ============================================================================
    -- CERTIFICATE TABLE INDEXES
    -- ============================================================================
    PRINT '6. Certificate table indexes...';
    PRINT '----------------------------------------';

    -- Index on userId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritCertificate_userId' AND object_id = OBJECT_ID('InspiritCertificate'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritCertificate_userId] ON [dbo].[InspiritCertificate]([userId]);
        PRINT '  ✓ Created: IX_InspiritCertificate_userId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritCertificate_userId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on trainingId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritCertificate_trainingId' AND object_id = OBJECT_ID('InspiritCertificate'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritCertificate_trainingId] ON [dbo].[InspiritCertificate]([trainingId]);
        PRINT '  ✓ Created: IX_InspiritCertificate_trainingId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritCertificate_trainingId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on validUntil (for filtering expiring certificates)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritCertificate_validUntil' AND object_id = OBJECT_ID('InspiritCertificate'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritCertificate_validUntil] ON [dbo].[InspiritCertificate]([validUntil]);
        PRINT '  ✓ Created: IX_InspiritCertificate_validUntil';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritCertificate_validUntil (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Note: certificateNumber has UNIQUE constraint (automatic index)
    PRINT '  ✓ certificateNumber already has unique constraint index';

    PRINT '';

    -- ============================================================================
    -- TRAININGASSIGNMENT TABLE INDEXES
    -- ============================================================================
    PRINT '7. InspiritTrainingAssignment table indexes...';
    PRINT '----------------------------------------';

    -- Index on trainerId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTrainingAssignment_trainerId' AND object_id = OBJECT_ID('InspiritTrainingAssignment'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTrainingAssignment_trainerId]
        ON [dbo].[InspiritTrainingAssignment]([trainerId]);
        PRINT '  ✓ Created: IX_InspiritTrainingAssignment_trainerId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTrainingAssignment_trainerId (already exists)';
        SET @SkippedCount = @SkippedCount + 1;
    END

    -- Index on trainingId (foreign key)
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_InspiritTrainingAssignment_trainingId' AND object_id = OBJECT_ID('InspiritTrainingAssignment'))
    BEGIN
        CREATE NONCLUSTERED INDEX [IX_InspiritTrainingAssignment_trainingId]
        ON [dbo].[InspiritTrainingAssignment]([trainingId]);
        PRINT '  ✓ Created: IX_InspiritTrainingAssignment_trainingId';
        SET @IndexCount = @IndexCount + 1;
    END
    ELSE
    BEGIN
        PRINT '  ⚠ Skipped: IX_InspiritTrainingAssignment_trainingId (already exists)';
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
