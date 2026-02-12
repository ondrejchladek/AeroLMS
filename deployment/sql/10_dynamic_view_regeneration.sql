/*******************************************************************************
 * AeroLMS - Dynamic View Regeneration (PRODUCTION)
 *
 * Purpose: Automatically regenerate InspiritCisZam VIEW based on training columns
 *          found in TabCisZam_EXT table
 *
 * SOLVES: No more hardcoded training columns in VIEW!
 *         Admin adds columns to TabCisZam_EXT → runs procedure → VIEW is updated
 *
 * Components:
 *   1. sp_RegenerateInspiritCisZamView - Main procedure to regenerate VIEW
 *   2. sp_GetTrainingValidityMonths - Helper to get validity from InspiritTraining
 *
 * Usage:
 *   EXEC sp_RegenerateInspiritCisZamView;
 *   -- Or with preview (doesn't execute, just prints SQL):
 *   EXEC sp_RegenerateInspiritCisZamView @PreviewOnly = 1;
 *
 * Run AFTER: 09_add_validity_months.sql
 ******************************************************************************/

USE Helios003;
GO

SET NOCOUNT ON;

PRINT '========================================';
PRINT 'AeroLMS - Dynamic View Regeneration';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ============================================================================
-- HELPER FUNCTION: Get validity months for a training code
-- ============================================================================
PRINT 'Creating helper function...';
GO

CREATE OR ALTER FUNCTION dbo.fn_GetTrainingValidityMonths(@TrainingCode NVARCHAR(100))
RETURNS INT
AS
BEGIN
    DECLARE @Months INT;

    SELECT @Months = validityMonths
    FROM InspiritTraining
    WHERE code = @TrainingCode AND deletedAt IS NULL;

    -- Default to 12 months if training not found or not configured
    RETURN ISNULL(@Months, 12);
END
GO

PRINT '✓ Created: fn_GetTrainingValidityMonths';
PRINT '';

-- ============================================================================
-- MAIN PROCEDURE: Regenerate InspiritCisZam VIEW dynamically
-- ============================================================================
PRINT 'Creating main regeneration procedure...';
GO

CREATE OR ALTER PROCEDURE dbo.sp_RegenerateInspiritCisZamView
    @PreviewOnly BIT = 0,           -- 1 = only print SQL, don't execute
    @DefaultValidityMonths INT = 12  -- Default validity if not in InspiritTraining
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX) = '';
    DECLARE @HeIQColumns NVARCHAR(MAX) = '';
    DECLARE @DateAddColumns NVARCHAR(MAX) = '';
    DECLARE @DirectColumns NVARCHAR(MAX) = '';
    DECLARE @TrainingCode NVARCHAR(100);
    DECLARE @ValidityMonths INT;
    DECLARE @Counter INT = 0;

    PRINT '========================================';
    PRINT 'Regenerating InspiritCisZam VIEW';
    PRINT 'Preview Only: ' + CASE WHEN @PreviewOnly = 1 THEN 'YES' ELSE 'NO' END;
    PRINT '========================================';
    PRINT '';

    -- ========================================================================
    -- STEP 1: Detect all training codes from TabCisZam_EXT columns
    -- ========================================================================
    PRINT 'Step 1: Detecting training columns...';

    -- Temp table to store detected trainings
    CREATE TABLE #DetectedTrainings (
        Code NVARCHAR(100) PRIMARY KEY,
        HasDatumPosl BIT DEFAULT 0,
        HasPozadovano BIT DEFAULT 0,
        ValidityMonths INT DEFAULT 12
    );

    -- Find all DatumPosl columns (pattern: _*DatumPosl)
    INSERT INTO #DetectedTrainings (Code, HasDatumPosl)
    SELECT
        SUBSTRING(COLUMN_NAME, 2, LEN(COLUMN_NAME) - 10) AS Code, -- Remove _ prefix and DatumPosl suffix
        1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'TabCisZam_EXT'
      AND TABLE_SCHEMA = 'dbo'
      AND COLUMN_NAME LIKE '[_]%DatumPosl'
      AND COLUMN_NAME NOT LIKE '[_]HeIQ%';

    -- Update Pozadovano flag
    UPDATE t
    SET HasPozadovano = 1
    FROM #DetectedTrainings t
    WHERE EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
        WHERE c.TABLE_NAME = 'TabCisZam_EXT'
          AND c.TABLE_SCHEMA = 'dbo'
          AND c.COLUMN_NAME = '_' + t.Code + 'Pozadovano'
    );

    -- Get validity months from InspiritTraining table
    UPDATE t
    SET ValidityMonths = ISNULL(it.validityMonths, @DefaultValidityMonths)
    FROM #DetectedTrainings t
    LEFT JOIN InspiritTraining it ON it.code = t.Code AND it.deletedAt IS NULL;

    -- Remove incomplete trainings (must have both DatumPosl and Pozadovano)
    DELETE FROM #DetectedTrainings WHERE HasDatumPosl = 0 OR HasPozadovano = 0;

    SELECT @Counter = COUNT(*) FROM #DetectedTrainings;
    PRINT '  Found ' + CAST(@Counter AS VARCHAR) + ' complete training codes';
    PRINT '';

    -- List detected trainings
    PRINT 'Detected trainings:';
    DECLARE @ListCursor CURSOR;
    SET @ListCursor = CURSOR FOR SELECT Code, ValidityMonths FROM #DetectedTrainings ORDER BY Code;
    OPEN @ListCursor;
    FETCH NEXT FROM @ListCursor INTO @TrainingCode, @ValidityMonths;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        PRINT '  - ' + @TrainingCode + ' (validity: ' + CAST(@ValidityMonths AS VARCHAR) + ' months)';
        FETCH NEXT FROM @ListCursor INTO @TrainingCode, @ValidityMonths;
    END
    CLOSE @ListCursor;
    DEALLOCATE @ListCursor;
    PRINT '';

    -- ========================================================================
    -- STEP 2: Generate dynamic column definitions
    -- ========================================================================
    PRINT 'Step 2: Generating column definitions...';

    DECLARE TrainingCursor CURSOR FOR
        SELECT Code, ValidityMonths FROM #DetectedTrainings ORDER BY Code;

    OPEN TrainingCursor;
    FETCH NEXT FROM TrainingCursor INTO @TrainingCode, @ValidityMonths;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- HeIQ Status Column (color-coded status indicator)
        SET @HeIQColumns = @HeIQColumns + '
        (CASE
            WHEN ((SELECT _' + @TrainingCode + 'DatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL
                OR (datediff(day, getdate(), DATEADD(month, ' + CAST(@ValidityMonths AS VARCHAR) + ', (SELECT _' + @TrainingCode + 'DatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0)
                AND (SELECT _' + @TrainingCode + 'Pozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1
            THEN 1
            WHEN (datediff(day, getdate(), DATEADD(month, ' + CAST(@ValidityMonths AS VARCHAR) + ', (SELECT _' + @TrainingCode + 'DatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30
                AND (SELECT _' + @TrainingCode + 'Pozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1
            THEN 65535
            WHEN (datediff(day, getdate(), DATEADD(month, ' + CAST(@ValidityMonths AS VARCHAR) + ', (SELECT _' + @TrainingCode + 'DatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31
                AND (SELECT _' + @TrainingCode + 'Pozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1
            THEN 2
            ELSE NULL
        END) AS _HeIQ_CB__' + @TrainingCode + 'DatumPristi,';

        -- DATEADD calculated column for DatumPristi
        SET @DateAddColumns = @DateAddColumns + '
        DATEADD(month, ' + CAST(@ValidityMonths AS VARCHAR) + ', (SELECT _' + @TrainingCode + 'DatumPosl FROM dbo.TabCisZam_EXT WHERE ID = dbo.TabCisZam.ID)) AS _' + @TrainingCode + 'DatumPristi,';

        -- Direct columns (Pozadovano and DatumPosl)
        SET @DirectColumns = @DirectColumns + '
        ISNULL(TabCisZam_EXT_1._' + @TrainingCode + 'Pozadovano, 0) AS _' + @TrainingCode + 'Pozadovano,
        TabCisZam_EXT_1._' + @TrainingCode + 'DatumPosl,';

        FETCH NEXT FROM TrainingCursor INTO @TrainingCode, @ValidityMonths;
    END

    CLOSE TrainingCursor;
    DEALLOCATE TrainingCursor;

    -- Remove trailing commas
    IF LEN(@HeIQColumns) > 0 SET @HeIQColumns = LEFT(@HeIQColumns, LEN(@HeIQColumns) - 1);
    IF LEN(@DateAddColumns) > 0 SET @DateAddColumns = LEFT(@DateAddColumns, LEN(@DateAddColumns) - 1);
    IF LEN(@DirectColumns) > 0 SET @DirectColumns = LEFT(@DirectColumns, LEN(@DirectColumns) - 1);

    PRINT '  Generated HeIQ columns: ' + CAST(LEN(@HeIQColumns) AS VARCHAR) + ' chars';
    PRINT '  Generated DATEADD columns: ' + CAST(LEN(@DateAddColumns) AS VARCHAR) + ' chars';
    PRINT '  Generated direct columns: ' + CAST(LEN(@DirectColumns) AS VARCHAR) + ' chars';
    PRINT '';

    -- ========================================================================
    -- STEP 3: Build complete VIEW SQL
    -- ========================================================================
    PRINT 'Step 3: Building VIEW SQL...';

    SET @SQL = '
CREATE OR ALTER VIEW dbo.InspiritCisZam AS
    SELECT TOP (100) PERCENT
        -- ====================================================================
        -- AUTH COLUMNS - From InspiritUserAuth
        -- ====================================================================
        COALESCE(auth.role, ''WORKER'') as role,
        auth.email,
        COALESCE(auth.createdAt, CURRENT_TIMESTAMP) as createdAt,
        COALESCE(auth.updatedAt, CURRENT_TIMESTAMP) as updatedAt,

        -- ====================================================================
        -- BASE EMPLOYEE COLUMNS - From TabCisZam
        -- ====================================================================
        dbo.TabCisZam.Cislo,
        dbo.TabCisZam.ID,
        dbo.TabCisZam.Jmeno,
        dbo.TabCisZam.Prijmeni,
        dbo.TabCisZam.Alias,

        -- ====================================================================
        -- HeIQ STATUS COLUMNS (dynamically generated)
        -- Color codes: 1=red (expired), 65535=orange (expiring), 2=green (valid)
        -- ====================================================================
        ' + @HeIQColumns + ',

        dbo.TabCisZam.Alias AS Expr1,
        TabCisZam_EXT_1._DruhPozice,

        -- ====================================================================
        -- DATEADD CALCULATED COLUMNS for DatumPristi (dynamically generated)
        -- ====================================================================
        ' + @DateAddColumns + ',

        -- ====================================================================
        -- DIRECT TRAINING COLUMNS (Pozadovano + DatumPosl, dynamically generated)
        -- ====================================================================
        ' + @DirectColumns + '

    FROM dbo.TabCisZam
    LEFT OUTER JOIN dbo.TabCisZam_EXT AS TabCisZam_EXT_1 ON TabCisZam_EXT_1.ID = dbo.TabCisZam.ID
    LEFT JOIN [dbo].[InspiritUserAuth] auth ON auth.ID = dbo.TabCisZam.ID

    WHERE (((CASE WHEN EXISTS (SELECT * FROM TabZamMzd WHERE ZamestnanecId = TabCisZam.ID)
        THEN CASE WHEN EXISTS (SELECT * FROM TabZamMzd WHERE IdObdobi = (SELECT id FROM TabMzdObd WHERE stav = 1) AND ZamestnanecId = TabCisZam.ID)
            THEN (SELECT StavES FROM TabZamMzd WHERE IdObdobi = (SELECT id FROM TabMzdObd WHERE stav = 1) AND ZamestnanecId = TabCisZam.ID)
            WHEN EXISTS (SELECT m.* FROM TabZamMzd m JOIN TabMzdObd o1 ON o1.IdObdobi = m.IdObdobi LEFT OUTER JOIN TabMzdObd o2 ON o2.IdObdobi = (SELECT id FROM TabMzdObd WHERE stav = 1) WHERE ((o1.Rok < o2.Rok) OR ((o1.Rok = o2.Rok) AND (o1.Mesic < o2.Mesic))) AND m.ZamestnanecId = TabCisZam.ID)
            THEN 4 ELSE 10 END
        ELSE CASE WHEN EXISTS (SELECT * FROM TabMzNastupPP WHERE ZamestnanecId = TabCisZam.ID) THEN 5 ELSE 6 END END)) = 0)
        AND ((SELECT DruhPP FROM dbo.TabZamMzd WHERE (IdObdobi = (SELECT ID FROM dbo.TabMzdObd WHERE (Stav = 1))) AND (ZamestnanecId = dbo.TabCisZam.ID)) = 0
            OR (SELECT DruhPP FROM dbo.TabZamMzd AS TabZamMzd_1 WHERE (IdObdobi = (SELECT ID FROM dbo.TabMzdObd AS TabMzdObd_1 WHERE (Stav = 1))) AND (ZamestnanecId = dbo.TabCisZam.ID)) = 1)
        OR (dbo.TabCisZam.Cislo = 381)
        OR (dbo.TabCisZam.Cislo = 429)
        OR (dbo.TabCisZam.Cislo = 900024)

    ORDER BY dbo.TabCisZam.Alias;
';

    -- ========================================================================
    -- STEP 4: Execute or Preview
    -- ========================================================================
    IF @PreviewOnly = 1
    BEGIN
        PRINT 'Step 4: PREVIEW MODE - SQL not executed';
        PRINT '';
        PRINT '========== GENERATED SQL ==========';
        PRINT @SQL;
        PRINT '====================================';
    END
    ELSE
    BEGIN
        PRINT 'Step 4: Executing VIEW creation...';

        BEGIN TRY
            EXEC sp_executesql @SQL;
            PRINT '✓ VIEW InspiritCisZam regenerated successfully!';
        END TRY
        BEGIN CATCH
            PRINT '✗ ERROR regenerating VIEW:';
            PRINT '  ' + ERROR_MESSAGE();
            THROW;
        END CATCH
    END

    -- Cleanup
    DROP TABLE #DetectedTrainings;

    PRINT '';
    PRINT '========================================';
    PRINT '✓ Regeneration complete';
    PRINT '  Training codes: ' + CAST(@Counter AS VARCHAR);
    PRINT '========================================';
END
GO

PRINT '✓ Created: sp_RegenerateInspiritCisZamView';
PRINT '';

-- ============================================================================
-- STEP 4: Initial execution to regenerate VIEW
-- ============================================================================
PRINT 'Step 4: Running initial VIEW regeneration...';
PRINT '';

EXEC sp_RegenerateInspiritCisZamView @PreviewOnly = 0;

GO

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
PRINT '';
PRINT '========================================';
PRINT 'USAGE INSTRUCTIONS';
PRINT '========================================';
PRINT '';
PRINT 'After adding new training columns to TabCisZam_EXT:';
PRINT '';
PRINT '1. Add columns to TabCisZam_EXT:';
PRINT '   ALTER TABLE TabCisZam_EXT ADD _NoveSkolDatumPosl DATETIME2 NULL;';
PRINT '   ALTER TABLE TabCisZam_EXT ADD _NoveSkolPozadovano BIT NULL;';
PRINT '';
PRINT '2. (Optional) Create/update InspiritTraining with validity:';
PRINT '   INSERT INTO InspiritTraining (code, name, validityMonths)';
PRINT '   VALUES (''NoveSkol'', ''Nove Skoleni'', 24);';
PRINT '';
PRINT '3. Regenerate the VIEW:';
PRINT '   EXEC sp_RegenerateInspiritCisZamView;';
PRINT '';
PRINT '4. Or preview first without executing:';
PRINT '   EXEC sp_RegenerateInspiritCisZamView @PreviewOnly = 1;';
PRINT '';
PRINT '========================================';

SET NOCOUNT OFF;
