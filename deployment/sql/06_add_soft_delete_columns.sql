/*******************************************************************************
 * AeroLMS - Add Soft Delete Support (PRODUCTION)
 *
 * Purpose: Add deletedAt column and indexes to 6 AeroLMS tables
 * Safe: Idempotent, uses IF NOT EXISTS
 ******************************************************************************/

USE Helios003;
GO

SET NOCOUNT ON;

PRINT 'Adding soft delete support...';
PRINT '';

-- Add deletedAt columns
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InspiritTraining') AND name = 'deletedAt')
    ALTER TABLE [dbo].[InspiritTraining] ADD [deletedAt] DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InspiritTest') AND name = 'deletedAt')
    ALTER TABLE [dbo].[InspiritTest] ADD [deletedAt] DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InspiritQuestion') AND name = 'deletedAt')
    ALTER TABLE [dbo].[InspiritQuestion] ADD [deletedAt] DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InspiritTestAttempt') AND name = 'deletedAt')
    ALTER TABLE [dbo].[InspiritTestAttempt] ADD [deletedAt] DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InspiritCertificate') AND name = 'deletedAt')
    ALTER TABLE [dbo].[InspiritCertificate] ADD [deletedAt] DATETIME2 NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InspiritTrainingAssignment') AND name = 'deletedAt')
    ALTER TABLE [dbo].[InspiritTrainingAssignment] ADD [deletedAt] DATETIME2 NULL;

GO

-- Create indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InspiritTraining_deletedAt')
    CREATE INDEX [IX_InspiritTraining_deletedAt] ON [dbo].[InspiritTraining]([deletedAt]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InspiritTest_deletedAt')
    CREATE INDEX [IX_InspiritTest_deletedAt] ON [dbo].[InspiritTest]([deletedAt]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InspiritQuestion_deletedAt')
    CREATE INDEX [IX_InspiritQuestion_deletedAt] ON [dbo].[InspiritQuestion]([deletedAt]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InspiritTestAttempt_deletedAt')
    CREATE INDEX [IX_InspiritTestAttempt_deletedAt] ON [dbo].[InspiritTestAttempt]([deletedAt]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InspiritCertificate_deletedAt')
    CREATE INDEX [IX_InspiritCertificate_deletedAt] ON [dbo].[InspiritCertificate]([deletedAt]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InspiritTrainingAssignment_deletedAt')
    CREATE INDEX [IX_InspiritTrainingAssignment_deletedAt] ON [dbo].[InspiritTrainingAssignment]([deletedAt]);

GO

PRINT 'Done.';
