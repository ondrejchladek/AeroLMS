/*******************************************************************************
 * AeroLMS - Complete Development Database Setup
 *
 * Purpose: Create COMPLETE database structure from scratch (IDENTICAL to production)
 * Environment: DEVELOPMENT (localhost SQL Server Express)
 *
 * This script creates EVERYTHING in correct order:
 *   1. Helios simulation tables (TabCisZam, TabCisZam_EXT)
 *   2. AeroLMS auth table (InspiritUserAuth)
 *   3. InspiritCisZam VIEW
 *   4. INSTEAD OF triggers
 *   5. AeroLMS application tables
 *   6. Indexes for performance
 *
 * Run this ONCE on empty AeroLMS database.
 * After this, run seed.js to populate data.
 ******************************************************************************/

USE AeroLMS;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT 'AeroLMS - Complete Dev Database Setup';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

BEGIN TRY
    BEGIN TRANSACTION;

    -- ========================================================================
    -- PART 1: HELIOS SIMULATION TABLES
    -- ========================================================================
    PRINT '🏗️  PART 1: Creating Helios simulation tables...';
    PRINT '';

    -- TabCisZam (Helios ERP employee master)
    PRINT 'Creating TabCisZam...';
    CREATE TABLE [dbo].[TabCisZam] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [Cislo] INT NOT NULL UNIQUE,
        [Jmeno] NVARCHAR(100) NOT NULL,
        [Prijmeni] NVARCHAR(100) NOT NULL,
        [Alias] NVARCHAR(255) NULL
    );
    PRINT '✓ TabCisZam created';
    PRINT '';

    -- TabCisZam_EXT (Helios ERP extension with training columns)
    PRINT 'Creating TabCisZam_EXT...';
    CREATE TABLE [dbo].[TabCisZam_EXT] (
        [ID] INT PRIMARY KEY,
        -- CMM Training (24 month validity)
        [_CMMDatumPosl] DATETIME2 NULL,
        [_CMMDatumPristi] DATETIME2 NULL,
        [_CMMPozadovano] BIT NOT NULL DEFAULT 0,
        -- EDM Training (12 month validity)
        [_EDMDatumPosl] DATETIME2 NULL,
        [_EDMDatumPristi] DATETIME2 NULL,
        [_EDMPozadovano] BIT NOT NULL DEFAULT 0,
        -- IT Security Training (12 month validity)
        [_ITBezpecnostDatumPosl] DATETIME2 NULL,
        [_ITBezpecnostDatumPristi] DATETIME2 NULL,
        [_ITBezpecnostPozadovano] BIT NOT NULL DEFAULT 0,
        CONSTRAINT [FK_TabCisZam_EXT_TabCisZam] FOREIGN KEY ([ID])
            REFERENCES [dbo].[TabCisZam]([ID]) ON DELETE CASCADE
    );
    PRINT '✓ TabCisZam_EXT created (trainings: CMM, EDM, ITBezpecnost)';
    PRINT '';

    -- InspiritUserAuth (AeroLMS authentication)
    PRINT 'Creating InspiritUserAuth...';
    CREATE TABLE [dbo].[InspiritUserAuth] (
        [ID] INT PRIMARY KEY,
        [role] NVARCHAR(50) NOT NULL DEFAULT 'WORKER',
        [email] NVARCHAR(255) NULL UNIQUE,
        [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [FK_InspiritUserAuth_TabCisZam] FOREIGN KEY ([ID])
            REFERENCES [dbo].[TabCisZam]([ID]) ON DELETE CASCADE
    );
    PRINT '✓ InspiritUserAuth created';
    PRINT '';

    -- ========================================================================
    -- PART 2: INSPIRIT VIEW
    -- ========================================================================
    PRINT '🏗️  PART 2: Creating InspiritCisZam VIEW...';
    PRINT '';

    -- InspiritCisZam VIEW
    PRINT 'Creating InspiritCisZam VIEW...';
    EXEC('
    CREATE VIEW [dbo].[InspiritCisZam] AS
        SELECT
            -- Auth columns
            COALESCE(auth.role, ''WORKER'') as role,
            auth.email,
            COALESCE(auth.createdAt, CURRENT_TIMESTAMP) as createdAt,
            COALESCE(auth.updatedAt, CURRENT_TIMESTAMP) as updatedAt,
            -- Employee data
            tc.Cislo,
            tc.ID,
            tc.Jmeno,
            tc.Prijmeni,
            tc.Alias,
            -- Training data - CMM
            ISNULL(ext._CMMPozadovano, 0) AS _CMMPozadovano,
            ext._CMMDatumPosl,
            ext._CMMDatumPristi,
            -- Training data - EDM
            ISNULL(ext._EDMPozadovano, 0) AS _EDMPozadovano,
            ext._EDMDatumPosl,
            ext._EDMDatumPristi,
            -- Training data - IT Security
            ISNULL(ext._ITBezpecnostPozadovano, 0) AS _ITBezpecnostPozadovano,
            ext._ITBezpecnostDatumPosl,
            ext._ITBezpecnostDatumPristi
        FROM [dbo].[TabCisZam] tc
        LEFT OUTER JOIN [dbo].[TabCisZam_EXT] ext ON ext.ID = tc.ID
        LEFT JOIN [dbo].[InspiritUserAuth] auth ON auth.ID = tc.ID
    ');
    PRINT '✓ InspiritCisZam VIEW created';
    PRINT '';

    -- INSTEAD OF INSERT Trigger
    PRINT 'Creating INSTEAD OF INSERT trigger...';
    EXEC('
    CREATE TRIGGER [dbo].[trg_InspiritCisZam_Insert]
        ON [dbo].[InspiritCisZam]
        INSTEAD OF INSERT
        AS
        BEGIN
            SET NOCOUNT ON;
            MERGE INTO [dbo].[InspiritUserAuth] AS target
            USING inserted AS source
            ON target.ID = source.ID
            WHEN MATCHED THEN
                UPDATE SET
                    role = COALESCE(source.role, ''WORKER''),
                    email = source.email,
                    updatedAt = CURRENT_TIMESTAMP
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (ID, role, email, createdAt, updatedAt)
                VALUES (
                    source.ID,
                    COALESCE(source.role, ''WORKER''),
                    source.email,
                    COALESCE(source.createdAt, CURRENT_TIMESTAMP),
                    COALESCE(source.updatedAt, CURRENT_TIMESTAMP)
                );
        END
    ');
    PRINT '✓ INSTEAD OF INSERT trigger created';
    PRINT '';

    -- INSTEAD OF UPDATE Trigger
    PRINT 'Creating INSTEAD OF UPDATE trigger...';
    EXEC('
    CREATE TRIGGER [dbo].[trg_InspiritCisZam_Update]
        ON [dbo].[InspiritCisZam]
        INSTEAD OF UPDATE
        AS
        BEGIN
            SET NOCOUNT ON;
            UPDATE a
            SET
                a.role = i.role,
                a.email = i.email,
                a.updatedAt = CURRENT_TIMESTAMP
            FROM [dbo].[InspiritUserAuth] a
            INNER JOIN inserted i ON a.ID = i.ID
            WHERE a.ID IN (SELECT ID FROM inserted);

            INSERT INTO [dbo].[InspiritUserAuth] (ID, role, email, createdAt, updatedAt)
            SELECT
                i.ID,
                COALESCE(i.role, ''WORKER''),
                i.email,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM inserted i
            WHERE NOT EXISTS (
                SELECT 1 FROM [dbo].[InspiritUserAuth] a
                WHERE a.ID = i.ID
            );
        END
    ');
    PRINT '✓ INSTEAD OF UPDATE trigger created';
    PRINT '';

    -- ========================================================================
    -- PART 3: AEROLMS APPLICATION TABLES
    -- ========================================================================
    PRINT '🏗️  PART 3: Creating AeroLMS application tables...';
    PRINT '';

    -- InspiritTraining
    PRINT 'Creating InspiritTraining...';
    CREATE TABLE [dbo].[InspiritTraining] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [code] NVARCHAR(100) NOT NULL UNIQUE,
        [name] NVARCHAR(500) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [content] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    PRINT '✓ InspiritTraining created';
    PRINT '';

    -- InspiritTest
    PRINT 'Creating InspiritTest...';
    CREATE TABLE [dbo].[InspiritTest] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [trainingId] INT NOT NULL,
        [title] NVARCHAR(500) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [isActive] BIT NOT NULL DEFAULT 1,
        [validFrom] DATETIME2 NULL,
        [validTo] DATETIME2 NULL,
        [passingScore] INT NOT NULL DEFAULT 75,
        [timeLimit] INT NULL DEFAULT 15,
        [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [FK_InspiritTest_Training] FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[InspiritTraining]([id]) ON DELETE NO ACTION
    );
    PRINT '✓ InspiritTest created';
    PRINT '';

    -- InspiritQuestion
    PRINT 'Creating InspiritQuestion...';
    CREATE TABLE [dbo].[InspiritQuestion] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [testId] INT NOT NULL,
        [order] INT NOT NULL,
        [type] NVARCHAR(50) NOT NULL,
        [question] NVARCHAR(MAX) NOT NULL,
        [options] NVARCHAR(MAX) NULL,
        [correctAnswer] NVARCHAR(MAX) NULL,
        [points] INT NOT NULL DEFAULT 1,
        [required] BIT NOT NULL DEFAULT 1,
        [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [FK_InspiritQuestion_Test] FOREIGN KEY ([testId])
            REFERENCES [dbo].[InspiritTest]([id]) ON DELETE NO ACTION
    );
    PRINT '✓ InspiritQuestion created';
    PRINT '';

    -- InspiritTestAttempt (FK to TabCisZam.ID, not User!)
    PRINT 'Creating InspiritTestAttempt...';
    CREATE TABLE [dbo].[InspiritTestAttempt] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [testId] INT NOT NULL,
        [userId] INT NOT NULL,
        [startedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [completedAt] DATETIME2 NULL,
        [score] FLOAT NULL,
        [passed] BIT NULL,
        [answers] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [FK_InspiritTestAttempt_Test] FOREIGN KEY ([testId])
            REFERENCES [dbo].[InspiritTest]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InspiritTestAttempt_User] FOREIGN KEY ([userId])
            REFERENCES [dbo].[TabCisZam]([ID]) ON DELETE NO ACTION
    );
    PRINT '✓ InspiritTestAttempt created (FK → TabCisZam.ID)';
    PRINT '';

    -- InspiritCertificate (FK to TabCisZam.ID, not User!)
    PRINT 'Creating InspiritCertificate...';
    CREATE TABLE [dbo].[InspiritCertificate] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [userId] INT NOT NULL,
        [trainingId] INT NOT NULL,
        [testAttemptId] INT NOT NULL UNIQUE,
        [certificateNumber] NVARCHAR(100) NOT NULL UNIQUE,
        [issuedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [validUntil] DATETIME2 NOT NULL,
        [pdfData] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [FK_InspiritCertificate_User] FOREIGN KEY ([userId])
            REFERENCES [dbo].[TabCisZam]([ID]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InspiritCertificate_Training] FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[InspiritTraining]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InspiritCertificate_TestAttempt] FOREIGN KEY ([testAttemptId])
            REFERENCES [dbo].[InspiritTestAttempt]([id]) ON DELETE CASCADE
    );
    PRINT '✓ InspiritCertificate created (FK → TabCisZam.ID)';
    PRINT '';

    -- InspiritTrainingAssignment (FK to TabCisZam.ID, not User!)
    PRINT 'Creating InspiritTrainingAssignment...';
    CREATE TABLE [dbo].[InspiritTrainingAssignment] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [trainerId] INT NOT NULL,
        [trainingId] INT NOT NULL,
        [assignedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [FK_InspiritTrainingAssignment_Trainer] FOREIGN KEY ([trainerId])
            REFERENCES [dbo].[TabCisZam]([ID]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InspiritTrainingAssignment_Training] FOREIGN KEY ([trainingId])
            REFERENCES [dbo].[InspiritTraining]([id]) ON DELETE NO ACTION,
        CONSTRAINT [UQ_InspiritTrainingAssignment] UNIQUE ([trainerId], [trainingId])
    );
    PRINT '✓ InspiritTrainingAssignment created (FK → TabCisZam.ID)';
    PRINT '';

    -- ========================================================================
    -- PART 4: INDEXES FOR PERFORMANCE
    -- ========================================================================
    PRINT '🏗️  PART 4: Creating indexes...';
    PRINT '';

    -- InspiritUserAuth indexes
    CREATE INDEX [IX_InspiritUserAuth_role] ON [dbo].[InspiritUserAuth]([role]);
    PRINT '✓ Index on InspiritUserAuth.role';

    -- InspiritTest indexes
    CREATE INDEX [IX_InspiritTest_trainingId] ON [dbo].[InspiritTest]([trainingId]);
    CREATE INDEX [IX_InspiritTest_isActive] ON [dbo].[InspiritTest]([isActive]);
    CREATE INDEX [IX_InspiritTest_trainingId_isActive] ON [dbo].[InspiritTest]([trainingId], [isActive]);
    PRINT '✓ Indexes on InspiritTest';

    -- InspiritQuestion indexes
    CREATE INDEX [IX_InspiritQuestion_testId] ON [dbo].[InspiritQuestion]([testId]);
    CREATE INDEX [IX_InspiritQuestion_testId_order] ON [dbo].[InspiritQuestion]([testId], [order]);
    PRINT '✓ Indexes on InspiritQuestion';

    -- InspiritTestAttempt indexes
    CREATE INDEX [IX_InspiritTestAttempt_userId] ON [dbo].[InspiritTestAttempt]([userId]);
    CREATE INDEX [IX_InspiritTestAttempt_testId] ON [dbo].[InspiritTestAttempt]([testId]);
    CREATE INDEX [IX_InspiritTestAttempt_userId_testId] ON [dbo].[InspiritTestAttempt]([userId], [testId]);
    CREATE INDEX [IX_InspiritTestAttempt_createdAt] ON [dbo].[InspiritTestAttempt]([createdAt] DESC);
    CREATE INDEX [IX_InspiritTestAttempt_completedAt] ON [dbo].[InspiritTestAttempt]([completedAt]);
    PRINT '✓ Indexes on InspiritTestAttempt';

    -- InspiritCertificate indexes
    CREATE INDEX [IX_InspiritCertificate_userId] ON [dbo].[InspiritCertificate]([userId]);
    CREATE INDEX [IX_InspiritCertificate_trainingId] ON [dbo].[InspiritCertificate]([trainingId]);
    CREATE INDEX [IX_InspiritCertificate_certificateNumber] ON [dbo].[InspiritCertificate]([certificateNumber]);
    CREATE INDEX [IX_InspiritCertificate_validUntil] ON [dbo].[InspiritCertificate]([validUntil]);
    PRINT '✓ Indexes on InspiritCertificate';

    -- InspiritTrainingAssignment indexes
    CREATE INDEX [IX_InspiritTrainingAssignment_trainerId] ON [dbo].[InspiritTrainingAssignment]([trainerId]);
    CREATE INDEX [IX_InspiritTrainingAssignment_trainingId] ON [dbo].[InspiritTrainingAssignment]([trainingId]);
    PRINT '✓ Indexes on InspiritTrainingAssignment';

    PRINT '';

    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✅ COMPLETE! Development database ready!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Architecture created:';
    PRINT '  1. ✓ Helios simulation (TabCisZam, TabCisZam_EXT)';
    PRINT '  2. ✓ AeroLMS auth (InspiritUserAuth)';
    PRINT '  3. ✓ InspiritCisZam VIEW';
    PRINT '  4. ✓ INSTEAD OF triggers';
    PRINT '  5. ✓ AeroLMS tables (6 tables)';
    PRINT '  6. ✓ Performance indexes';
    PRINT '';
    PRINT 'IMPORTANT:';
    PRINT '  - FK constraints point to TabCisZam.ID (physical table)';
    PRINT '  - Prisma User model maps to InspiritCisZam VIEW';
    PRINT '  - IDENTICAL architecture to production!';
    PRINT '';
    PRINT 'Next step: Run seed.js to populate data';
    PRINT '';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT '';
    PRINT '❌ ERROR: ' + ERROR_MESSAGE();
    PRINT '   Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
    PRINT '';
    PRINT 'Transaction rolled back. No changes made.';
    PRINT '';

    THROW;
END CATCH;

SET NOCOUNT OFF;
