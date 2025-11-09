/*******************************************************************************
 * AeroLMS - Create AeroLMS Application Tables (PRODUCTION)
 *
 * Purpose: Create all required tables for AeroLMS application logic
 * Safe: Uses IF NOT EXISTS pattern, won't drop existing tables
 *
 * Tables created:
 *   - InspiritTraining (training modules)
 *   - InspiritTest (assessments per training)
 *   - InspiritQuestion (test questions)
 *   - InspiritTestAttempt (user test results)
 *   - InspiritCertificate (training certificates)
 *   - InspiritTrainingAssignment (trainer-training assignments)
 *
 * Foreign Keys:
 *   - User FK references point to TabCisZam.ID (physical table)
 *   - Application uses InspiritCisZam Prisma model for queries
 *
 * Run AFTER: 03_create_inspirit_view.sql
 * Run BEFORE: 05_create_indexes.sql
 ******************************************************************************/

USE Helios003;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON; -- Rollback entire transaction on error

PRINT '========================================';
PRINT 'AeroLMS - Creating Application Tables';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

BEGIN TRY
    BEGIN TRANSACTION;

    -- ============================================================================
    -- TABLE 1: InspiritTraining
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTraining' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating InspiritTraining table...';

        CREATE TABLE [dbo].[InspiritTraining] (
            [id] INT NOT NULL IDENTITY(1,1),
            [code] NVARCHAR(100) NOT NULL,
            [name] NVARCHAR(500) NOT NULL,
            [description] NVARCHAR(MAX) NULL,
            [content] NVARCHAR(MAX) NULL,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTraining_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTraining_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [InspiritTraining_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [InspiritTraining_code_key] UNIQUE NONCLUSTERED ([code])
        );

        PRINT '✓ InspiritTraining table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ InspiritTraining table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 2: InspiritTest
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTest' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating InspiritTest table...';

        CREATE TABLE [dbo].[InspiritTest] (
            [id] INT NOT NULL IDENTITY(1,1),
            [trainingId] INT NOT NULL,
            [title] NVARCHAR(500) NOT NULL,
            [description] NVARCHAR(MAX) NULL,
            [isActive] BIT NOT NULL CONSTRAINT [InspiritTest_isActive_df] DEFAULT 1,
            [validFrom] DATETIME2 NULL,
            [validTo] DATETIME2 NULL,
            [passingScore] INT NOT NULL CONSTRAINT [InspiritTest_passingScore_df] DEFAULT 75,
            [timeLimit] INT NULL CONSTRAINT [InspiritTest_timeLimit_df] DEFAULT 15,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTest_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [InspiritTest_pkey] PRIMARY KEY CLUSTERED ([id])
        );

        -- Foreign key to InspiritTraining
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTraining' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritTest]
            ADD CONSTRAINT [InspiritTest_trainingId_fkey]
            FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[InspiritTraining]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        PRINT '✓ InspiritTest table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ InspiritTest table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 3: InspiritQuestion
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritQuestion' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating InspiritQuestion table...';

        CREATE TABLE [dbo].[InspiritQuestion] (
            [id] INT NOT NULL IDENTITY(1,1),
            [testId] INT NOT NULL,
            [order] INT NOT NULL,
            [type] NVARCHAR(50) NOT NULL,
            [question] NVARCHAR(MAX) NOT NULL,
            [options] NVARCHAR(MAX) NULL,
            [correctAnswer] NVARCHAR(MAX) NULL,
            [points] INT NOT NULL CONSTRAINT [InspiritQuestion_points_df] DEFAULT 1,
            [required] BIT NOT NULL CONSTRAINT [InspiritQuestion_required_df] DEFAULT 1,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [InspiritQuestion_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritQuestion_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [InspiritQuestion_pkey] PRIMARY KEY CLUSTERED ([id])
        );

        -- Foreign key to InspiritTest
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTest' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritQuestion]
            ADD CONSTRAINT [InspiritQuestion_testId_fkey]
            FOREIGN KEY ([testId])
            REFERENCES [dbo].[InspiritTest]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        PRINT '✓ InspiritQuestion table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ InspiritQuestion table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 4: InspiritTestAttempt
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTestAttempt' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating InspiritTestAttempt table...';

        CREATE TABLE [dbo].[InspiritTestAttempt] (
            [id] INT NOT NULL IDENTITY(1,1),
            [testId] INT NOT NULL,
            [userId] INT NOT NULL,
            [startedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTestAttempt_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
            [completedAt] DATETIME2 NULL,
            [score] FLOAT NULL,
            [passed] BIT NULL,
            [answers] NVARCHAR(MAX) NULL,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTestAttempt_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTestAttempt_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [InspiritTestAttempt_pkey] PRIMARY KEY CLUSTERED ([id])
        );

        -- Foreign key to InspiritTest
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTest' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritTestAttempt]
            ADD CONSTRAINT [InspiritTestAttempt_testId_fkey]
            FOREIGN KEY ([testId])
            REFERENCES [dbo].[InspiritTest]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        -- Foreign key to TabCisZam
        -- Note: FK must reference the actual base table, not VIEW
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'TabCisZam' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritTestAttempt]
            ADD CONSTRAINT [InspiritTestAttempt_userId_fkey]
            FOREIGN KEY ([userId])
            REFERENCES [dbo].[TabCisZam]([ID])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
            PRINT '  → FK to TabCisZam.ID';
        END

        PRINT '✓ InspiritTestAttempt table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ InspiritTestAttempt table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 5: InspiritCertificate
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritCertificate' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating InspiritCertificate table...';

        CREATE TABLE [dbo].[InspiritCertificate] (
            [id] INT NOT NULL IDENTITY(1,1),
            [userId] INT NOT NULL,
            [trainingId] INT NOT NULL,
            [testAttemptId] INT NOT NULL,
            [certificateNumber] NVARCHAR(100) NOT NULL,
            [issuedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritCertificate_issuedAt_df] DEFAULT CURRENT_TIMESTAMP,
            [validUntil] DATETIME2 NOT NULL,
            [pdfData] NVARCHAR(MAX) NULL,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [InspiritCertificate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritCertificate_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [InspiritCertificate_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [InspiritCertificate_testAttemptId_key] UNIQUE NONCLUSTERED ([testAttemptId]),
            CONSTRAINT [InspiritCertificate_certificateNumber_key] UNIQUE NONCLUSTERED ([certificateNumber])
        );

        -- Foreign key to TabCisZam
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'TabCisZam' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritCertificate]
            ADD CONSTRAINT [InspiritCertificate_userId_fkey]
            FOREIGN KEY ([userId])
            REFERENCES [dbo].[TabCisZam]([ID])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        -- Foreign key to InspiritTraining
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTraining' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritCertificate]
            ADD CONSTRAINT [InspiritCertificate_trainingId_fkey]
            FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[InspiritTraining]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        -- Foreign key to InspiritTestAttempt
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTestAttempt' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritCertificate]
            ADD CONSTRAINT [InspiritCertificate_testAttemptId_fkey]
            FOREIGN KEY ([testAttemptId])
            REFERENCES [dbo].[InspiritTestAttempt]([id])
            ON DELETE CASCADE;
        END

        PRINT '✓ InspiritCertificate table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ InspiritCertificate table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 6: InspiritTrainingAssignment
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTrainingAssignment' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating InspiritTrainingAssignment table...';

        CREATE TABLE [dbo].[InspiritTrainingAssignment] (
            [id] INT NOT NULL IDENTITY(1,1),
            [trainerId] INT NOT NULL,
            [trainingId] INT NOT NULL,
            [assignedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTrainingAssignment_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [InspiritTrainingAssignment_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [InspiritTrainingAssignment_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [InspiritTrainingAssignment_trainerId_trainingId_key] UNIQUE NONCLUSTERED ([trainerId], [trainingId])
        );

        -- Foreign key to TabCisZam (trainer)
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'TabCisZam' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritTrainingAssignment]
            ADD CONSTRAINT [InspiritTrainingAssignment_trainerId_fkey]
            FOREIGN KEY ([trainerId])
            REFERENCES [dbo].[TabCisZam]([ID])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        -- Foreign key to InspiritTraining
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'InspiritTraining' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[InspiritTrainingAssignment]
            ADD CONSTRAINT [InspiritTrainingAssignment_trainingId_fkey]
            FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[InspiritTraining]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        PRINT '✓ InspiritTrainingAssignment table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ InspiritTrainingAssignment table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- Commit Transaction
    -- ============================================================================
    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✓ All AeroLMS tables created successfully!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Next step: Run 05_create_indexes.sql';
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
    END

    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
    DECLARE @ErrorState INT = ERROR_STATE();

    PRINT 'Error Message: ' + @ErrorMessage;
    PRINT 'Error Severity: ' + CAST(@ErrorSeverity AS VARCHAR);
    PRINT 'Error State: ' + CAST(@ErrorState AS VARCHAR);

    -- Re-throw the error
    THROW;
END CATCH

SET NOCOUNT OFF;
