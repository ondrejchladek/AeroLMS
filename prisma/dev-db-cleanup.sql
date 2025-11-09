/*******************************************************************************
 * AeroLMS - Development Database Cleanup
 *
 * Purpose: Clean up old development structure before applying new architecture
 * Environment: DEVELOPMENT (localhost SQL Server Express)
 *
 * This script drops ALL existing tables and starts fresh.
 * Safe to run multiple times.
 ******************************************************************************/

USE AeroLMS;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT 'AeroLMS - Development Database Cleanup';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ============================================================================
-- STEP 1: Drop Foreign Key Constraints (in dependency order)
-- ============================================================================
PRINT 'Dropping foreign key constraints...';

-- InspiritCertificate constraints
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritCertificate_userId_fkey')
BEGIN
    ALTER TABLE InspiritCertificate DROP CONSTRAINT InspiritCertificate_userId_fkey;
    PRINT '  ✓ Dropped InspiritCertificate_userId_fkey';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritCertificate_trainingId_fkey')
BEGIN
    ALTER TABLE InspiritCertificate DROP CONSTRAINT InspiritCertificate_trainingId_fkey;
    PRINT '  ✓ Dropped InspiritCertificate_trainingId_fkey';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritCertificate_testAttemptId_fkey')
BEGIN
    ALTER TABLE InspiritCertificate DROP CONSTRAINT InspiritCertificate_testAttemptId_fkey;
    PRINT '  ✓ Dropped InspiritCertificate_testAttemptId_fkey';
END

-- InspiritTestAttempt constraints
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritTestAttempt_userId_fkey')
BEGIN
    ALTER TABLE InspiritTestAttempt DROP CONSTRAINT InspiritTestAttempt_userId_fkey;
    PRINT '  ✓ Dropped InspiritTestAttempt_userId_fkey';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritTestAttempt_testId_fkey')
BEGIN
    ALTER TABLE InspiritTestAttempt DROP CONSTRAINT InspiritTestAttempt_testId_fkey;
    PRINT '  ✓ Dropped InspiritTestAttempt_testId_fkey';
END

-- InspiritTrainingAssignment constraints
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritTrainingAssignment_trainerId_fkey')
BEGIN
    ALTER TABLE InspiritTrainingAssignment DROP CONSTRAINT InspiritTrainingAssignment_trainerId_fkey;
    PRINT '  ✓ Dropped InspiritTrainingAssignment_trainerId_fkey';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritTrainingAssignment_trainingId_fkey')
BEGIN
    ALTER TABLE InspiritTrainingAssignment DROP CONSTRAINT InspiritTrainingAssignment_trainingId_fkey;
    PRINT '  ✓ Dropped InspiritTrainingAssignment_trainingId_fkey';
END

-- InspiritQuestion constraints
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritQuestion_testId_fkey')
BEGIN
    ALTER TABLE InspiritQuestion DROP CONSTRAINT InspiritQuestion_testId_fkey;
    PRINT '  ✓ Dropped InspiritQuestion_testId_fkey';
END

-- InspiritTest constraints
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritTest_trainingId_fkey')
BEGIN
    ALTER TABLE InspiritTest DROP CONSTRAINT InspiritTest_trainingId_fkey;
    PRINT '  ✓ Dropped InspiritTest_trainingId_fkey';
END

-- TabCisZam_EXT constraints
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'TabCisZam_EXT_id_fkey')
BEGIN
    ALTER TABLE TabCisZam_EXT DROP CONSTRAINT TabCisZam_EXT_id_fkey;
    PRINT '  ✓ Dropped TabCisZam_EXT_id_fkey';
END

-- InspiritUserAuth constraints
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'InspiritUserAuth_id_fkey')
BEGIN
    ALTER TABLE InspiritUserAuth DROP CONSTRAINT InspiritUserAuth_id_fkey;
    PRINT '  ✓ Dropped InspiritUserAuth_id_fkey';
END

PRINT '';

-- ============================================================================
-- STEP 2: Drop INSTEAD OF Triggers
-- ============================================================================
PRINT 'Dropping INSTEAD OF triggers...';

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_InspiritCisZam_Insert')
BEGIN
    DROP TRIGGER [dbo].[trg_InspiritCisZam_Insert];
    PRINT '  ✓ Dropped trg_InspiritCisZam_Insert';
END

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_InspiritCisZam_Update')
BEGIN
    DROP TRIGGER [dbo].[trg_InspiritCisZam_Update];
    PRINT '  ✓ Dropped trg_InspiritCisZam_Update';
END

PRINT '';

-- ============================================================================
-- STEP 3: Drop User SYNONYM
-- ============================================================================
PRINT 'Dropping User SYNONYM...';

IF EXISTS (SELECT * FROM sys.synonyms WHERE name = 'User' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    DROP SYNONYM [dbo].[User];
    PRINT '  ✓ Dropped User SYNONYM';
END

PRINT '';

-- ============================================================================
-- STEP 4: Drop InspiritCisZam VIEW
-- ============================================================================
PRINT 'Dropping InspiritCisZam VIEW...';

IF EXISTS (SELECT * FROM sys.views WHERE name = 'InspiritCisZam')
BEGIN
    DROP VIEW [dbo].[InspiritCisZam];
    PRINT '  ✓ Dropped InspiritCisZam VIEW';
END

PRINT '';

-- ============================================================================
-- STEP 5: Drop Tables (in dependency order)
-- ============================================================================
PRINT 'Dropping tables...';

-- AeroLMS tables
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'InspiritCertificate' AND type = 'U')
BEGIN
    DROP TABLE InspiritCertificate;
    PRINT '  ✓ Dropped InspiritCertificate';
END

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'InspiritTestAttempt' AND type = 'U')
BEGIN
    DROP TABLE InspiritTestAttempt;
    PRINT '  ✓ Dropped InspiritTestAttempt';
END

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'InspiritTrainingAssignment' AND type = 'U')
BEGIN
    DROP TABLE InspiritTrainingAssignment;
    PRINT '  ✓ Dropped InspiritTrainingAssignment';
END

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'InspiritQuestion' AND type = 'U')
BEGIN
    DROP TABLE InspiritQuestion;
    PRINT '  ✓ Dropped InspiritQuestion';
END

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'InspiritTest' AND type = 'U')
BEGIN
    DROP TABLE InspiritTest;
    PRINT '  ✓ Dropped InspiritTest';
END

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'InspiritTraining' AND type = 'U')
BEGIN
    DROP TABLE InspiritTraining;
    PRINT '  ✓ Dropped InspiritTraining';
END

-- Old User table
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'User' AND type = 'U')
BEGIN
    DROP TABLE [User];
    PRINT '  ✓ Dropped User table (old structure)';
END

-- Helios simulation tables
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'InspiritUserAuth' AND type = 'U')
BEGIN
    DROP TABLE InspiritUserAuth;
    PRINT '  ✓ Dropped InspiritUserAuth';
END

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'TabCisZam_EXT' AND type = 'U')
BEGIN
    DROP TABLE TabCisZam_EXT;
    PRINT '  ✓ Dropped TabCisZam_EXT';
END

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'TabCisZam' AND type = 'U')
BEGIN
    DROP TABLE TabCisZam;
    PRINT '  ✓ Dropped TabCisZam';
END

PRINT '';

PRINT '========================================';
PRINT '✓ Database cleanup complete!';
PRINT '========================================';
PRINT '';
PRINT 'Next step: Run dev-db-setup.sql to create new structure';
PRINT '';

SET NOCOUNT OFF;
