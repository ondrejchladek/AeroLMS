/*******************************************************************************
 * AeroLMS - Create New Tables Script
 *
 * Purpose: Create all required tables for AeroLMS (except User table)
 * Safe: Uses IF NOT EXISTS pattern, won't drop existing tables
 *
 * Tables created:
 *   - Training
 *   - Test
 *   - Question
 *   - TestAttempt
 *   - Certificate
 *   - TrainingAssignment
 *
 * Run AFTER: 01_pre_deployment_check.sql
 * Run BEFORE: 03_alter_user_table.sql
 ******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON; -- Rollback entire transaction on error

PRINT '========================================';
PRINT 'AeroLMS - Creating New Tables';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

BEGIN TRY
    BEGIN TRANSACTION;

    -- ============================================================================
    -- TABLE 1: Training
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Training' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating Training table...';

        CREATE TABLE [dbo].[Training] (
            [id] INT NOT NULL IDENTITY(1,1),
            [code] NVARCHAR(100) NOT NULL,
            [name] NVARCHAR(500) NOT NULL,
            [description] NVARCHAR(MAX) NULL,
            [content] NVARCHAR(MAX) NULL,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [Training_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Training_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [Training_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [Training_code_key] UNIQUE NONCLUSTERED ([code])
        );

        PRINT '✓ Training table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ Training table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 2: Test
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Test' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating Test table...';

        CREATE TABLE [dbo].[Test] (
            [id] INT NOT NULL IDENTITY(1,1),
            [trainingId] INT NOT NULL,
            [title] NVARCHAR(500) NOT NULL,
            [description] NVARCHAR(MAX) NULL,
            [isActive] BIT NOT NULL CONSTRAINT [Test_isActive_df] DEFAULT 1,
            [validFrom] DATETIME2 NULL,
            [validTo] DATETIME2 NULL,
            [passingScore] INT NOT NULL CONSTRAINT [Test_passingScore_df] DEFAULT 75,
            [timeLimit] INT NULL CONSTRAINT [Test_timeLimit_df] DEFAULT 15,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [Test_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Test_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [Test_pkey] PRIMARY KEY CLUSTERED ([id])
        );

        -- Foreign key to Training
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Training' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[Test]
            ADD CONSTRAINT [Test_trainingId_fkey]
            FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[Training]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        PRINT '✓ Test table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ Test table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 3: Question
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Question' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating Question table...';

        CREATE TABLE [dbo].[Question] (
            [id] INT NOT NULL IDENTITY(1,1),
            [testId] INT NOT NULL,
            [order] INT NOT NULL,
            [type] NVARCHAR(50) NOT NULL,
            [question] NVARCHAR(MAX) NOT NULL,
            [options] NVARCHAR(MAX) NULL,
            [correctAnswer] NVARCHAR(MAX) NULL,
            [points] INT NOT NULL CONSTRAINT [Question_points_df] DEFAULT 1,
            [required] BIT NOT NULL CONSTRAINT [Question_required_df] DEFAULT 1,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [Question_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Question_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [Question_pkey] PRIMARY KEY CLUSTERED ([id])
        );

        -- Foreign key to Test
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Test' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[Question]
            ADD CONSTRAINT [Question_testId_fkey]
            FOREIGN KEY ([testId])
            REFERENCES [dbo].[Test]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        PRINT '✓ Question table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ Question table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 4: TestAttempt
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'TestAttempt' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating TestAttempt table...';

        CREATE TABLE [dbo].[TestAttempt] (
            [id] INT NOT NULL IDENTITY(1,1),
            [testId] INT NOT NULL,
            [userId] INT NOT NULL,
            [startedAt] DATETIME2 NOT NULL CONSTRAINT [TestAttempt_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
            [completedAt] DATETIME2 NULL,
            [score] FLOAT NULL,
            [passed] BIT NULL,
            [answers] NVARCHAR(MAX) NULL,
            [employeeCode] INT NULL,
            [employeeName] NVARCHAR(500) NULL,
            [department] NVARCHAR(200) NULL,
            [workPosition] NVARCHAR(200) NULL,
            [supervisor] NVARCHAR(200) NULL,
            [evaluator] NVARCHAR(200) NULL,
            [signatureData] NVARCHAR(MAX) NULL,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [TestAttempt_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [TestAttempt_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [TestAttempt_pkey] PRIMARY KEY CLUSTERED ([id])
        );

        -- Foreign key to Test
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Test' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[TestAttempt]
            ADD CONSTRAINT [TestAttempt_testId_fkey]
            FOREIGN KEY ([testId])
            REFERENCES [dbo].[Test]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        -- Foreign key to User (if exists)
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'User' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[TestAttempt]
            ADD CONSTRAINT [TestAttempt_userId_fkey]
            FOREIGN KEY ([userId])
            REFERENCES [dbo].[User]([UserID])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        PRINT '✓ TestAttempt table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ TestAttempt table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 5: Certificate
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Certificate' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating Certificate table...';

        CREATE TABLE [dbo].[Certificate] (
            [id] INT NOT NULL IDENTITY(1,1),
            [userId] INT NOT NULL,
            [trainingId] INT NOT NULL,
            [testAttemptId] INT NOT NULL,
            [certificateNumber] NVARCHAR(100) NOT NULL,
            [issuedAt] DATETIME2 NOT NULL CONSTRAINT [Certificate_issuedAt_df] DEFAULT CURRENT_TIMESTAMP,
            [validUntil] DATETIME2 NOT NULL,
            [pdfData] NVARCHAR(MAX) NULL,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [Certificate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [Certificate_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [Certificate_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [Certificate_testAttemptId_key] UNIQUE NONCLUSTERED ([testAttemptId]),
            CONSTRAINT [Certificate_certificateNumber_key] UNIQUE NONCLUSTERED ([certificateNumber])
        );

        -- Foreign keys
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'User' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[Certificate]
            ADD CONSTRAINT [Certificate_userId_fkey]
            FOREIGN KEY ([userId])
            REFERENCES [dbo].[User]([UserID])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Training' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[Certificate]
            ADD CONSTRAINT [Certificate_trainingId_fkey]
            FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[Training]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'TestAttempt' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[Certificate]
            ADD CONSTRAINT [Certificate_testAttemptId_fkey]
            FOREIGN KEY ([testAttemptId])
            REFERENCES [dbo].[TestAttempt]([id])
            ON DELETE CASCADE;
        END

        PRINT '✓ Certificate table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ Certificate table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- TABLE 6: TrainingAssignment
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'TrainingAssignment' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating TrainingAssignment table...';

        CREATE TABLE [dbo].[TrainingAssignment] (
            [id] INT NOT NULL IDENTITY(1,1),
            [trainerId] INT NOT NULL,
            [trainingId] INT NOT NULL,
            [assignedAt] DATETIME2 NOT NULL CONSTRAINT [TrainingAssignment_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
            [updatedAt] DATETIME2 NOT NULL CONSTRAINT [TrainingAssignment_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [TrainingAssignment_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [TrainingAssignment_trainerId_trainingId_key] UNIQUE NONCLUSTERED ([trainerId], [trainingId])
        );

        -- Foreign keys
        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'User' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[TrainingAssignment]
            ADD CONSTRAINT [TrainingAssignment_trainerId_fkey]
            FOREIGN KEY ([trainerId])
            REFERENCES [dbo].[User]([UserID])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'Training' AND TABLE_SCHEMA = 'dbo')
        BEGIN
            ALTER TABLE [dbo].[TrainingAssignment]
            ADD CONSTRAINT [TrainingAssignment_trainingId_fkey]
            FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[Training]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
        END

        PRINT '✓ TrainingAssignment table created';
    END
    ELSE
    BEGIN
        PRINT '⚠ TrainingAssignment table already exists (skipped)';
    END

    PRINT '';

    -- ============================================================================
    -- Commit Transaction
    -- ============================================================================
    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✓ All tables created successfully!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Next step: Run 03_alter_user_table.sql';
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
