/*******************************************************************************
 * AeroLMS - Fix DatumPristi Columns to Match Production Architecture
 *
 * Purpose: Remove physical DatumPristi columns, compute them in VIEW instead
 * Environment: DEVELOPMENT (localhost SQL Server Express)
 *
 * Problem:
 *   - Development had physical _*DatumPristi columns in TabCisZam_EXT
 *   - Production computes these dynamically in VIEW using DATEADD
 *   - This causes architecture mismatch and detection issues
 *
 * Fix:
 *   1. DROP physical _*DatumPristi columns from TabCisZam_EXT
 *   2. ALTER VIEW to compute DatumPristi dynamically via DATEADD
 *
 * Result: Development architecture matches production (IDENTICAL)
 ******************************************************************************/

USE AeroLMS;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT 'AeroLMS - Fix DatumPristi Computed Columns';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

BEGIN TRY
    BEGIN TRANSACTION;

    -- ========================================================================
    -- STEP 1: DROP VIEW (required before altering table structure)
    -- ========================================================================
    PRINT 'Step 1: Dropping InspiritCisZam VIEW...';
    PRINT '----------------------------------------';

    IF EXISTS (SELECT * FROM sys.views WHERE name = 'InspiritCisZam')
    BEGIN
        DROP VIEW [dbo].[InspiritCisZam];
        PRINT '✓ VIEW dropped';
    END
    ELSE
    BEGIN
        PRINT '⚠️  VIEW not found (skipped)';
    END
    PRINT '';

    -- ========================================================================
    -- STEP 2: DROP physical DatumPristi columns from TabCisZam_EXT
    -- ========================================================================
    PRINT 'Step 2: Dropping physical DatumPristi columns...';
    PRINT '----------------------------------------';

    -- CMM
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'TabCisZam_EXT'
               AND COLUMN_NAME = '_CMMDatumPristi')
    BEGIN
        ALTER TABLE [dbo].[TabCisZam_EXT] DROP COLUMN [_CMMDatumPristi];
        PRINT '✓ Dropped _CMMDatumPristi';
    END

    -- EDM
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'TabCisZam_EXT'
               AND COLUMN_NAME = '_EDMDatumPristi')
    BEGIN
        ALTER TABLE [dbo].[TabCisZam_EXT] DROP COLUMN [_EDMDatumPristi];
        PRINT '✓ Dropped _EDMDatumPristi';
    END

    -- ITBezpecnost
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'TabCisZam_EXT'
               AND COLUMN_NAME = '_ITBezpecnostDatumPristi')
    BEGIN
        ALTER TABLE [dbo].[TabCisZam_EXT] DROP COLUMN [_ITBezpecnostDatumPristi];
        PRINT '✓ Dropped _ITBezpecnostDatumPristi';
    END

    PRINT '';
    PRINT 'Remaining columns in TabCisZam_EXT:';
    PRINT '  - ID (PK)';
    PRINT '  - _CMMDatumPosl, _CMMPozadovano';
    PRINT '  - _EDMDatumPosl, _EDMPozadovano';
    PRINT '  - _ITBezpecnostDatumPosl, _ITBezpecnostPozadovano';
    PRINT '';

    -- ========================================================================
    -- STEP 3: Recreate VIEW with COMPUTED DatumPristi columns
    -- ========================================================================
    PRINT 'Step 3: Recreating InspiritCisZam VIEW with computed columns...';
    PRINT '----------------------------------------';

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
            -- Training data - CMM (validity: 24 months)
            ISNULL(ext._CMMPozadovano, 0) AS _CMMPozadovano,
            ext._CMMDatumPosl,
            DATEADD(month, 24, ext._CMMDatumPosl) AS _CMMDatumPristi,
            -- Training data - EDM (validity: 12 months)
            ISNULL(ext._EDMPozadovano, 0) AS _EDMPozadovano,
            ext._EDMDatumPosl,
            DATEADD(month, 12, ext._EDMDatumPosl) AS _EDMDatumPristi,
            -- Training data - IT Security (validity: 12 months)
            ISNULL(ext._ITBezpecnostPozadovano, 0) AS _ITBezpecnostPozadovano,
            ext._ITBezpecnostDatumPosl,
            DATEADD(month, 12, ext._ITBezpecnostDatumPosl) AS _ITBezpecnostDatumPristi
        FROM [dbo].[TabCisZam] tc
        LEFT OUTER JOIN [dbo].[TabCisZam_EXT] ext ON ext.ID = tc.ID
        LEFT JOIN [dbo].[InspiritUserAuth] auth ON auth.ID = tc.ID
    ');

    PRINT '✓ VIEW recreated with computed DatumPristi columns';
    PRINT '';
    PRINT 'Computed columns (via DATEADD):';
    PRINT '  - _CMMDatumPristi = DATEADD(month, 24, _CMMDatumPosl)';
    PRINT '  - _EDMDatumPristi = DATEADD(month, 12, _EDMDatumPosl)';
    PRINT '  - _ITBezpecnostDatumPristi = DATEADD(month, 12, _ITBezpecnostDatumPosl)';
    PRINT '';

    -- ========================================================================
    -- STEP 4: Recreate INSTEAD OF triggers
    -- ========================================================================
    PRINT 'Step 4: Recreating INSTEAD OF triggers...';
    PRINT '----------------------------------------';

    -- INSTEAD OF INSERT
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

    -- INSTEAD OF UPDATE
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

    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✅ Migration completed successfully!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Architecture changes:';
    PRINT '  ✓ Physical DatumPristi columns removed';
    PRINT '  ✓ DatumPristi now computed in VIEW (like production)';
    PRINT '  ✓ Development architecture matches production';
    PRINT '';
    PRINT 'Next steps:';
    PRINT '  1. Run: npx prisma generate';
    PRINT '  2. Restart dev server: npm run dev';
    PRINT '  3. Test training detection works correctly';
    PRINT '';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT '';
    PRINT '========================================';
    PRINT '❌ ERROR: Migration failed!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Error Details:';
    PRINT '  Message: ' + ERROR_MESSAGE();
    PRINT '  Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
    PRINT '';
    PRINT 'Transaction rolled back. Database unchanged.';
    PRINT '';

    THROW;
END CATCH;

SET NOCOUNT OFF;
