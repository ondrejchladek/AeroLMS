/*******************************************************************************
 * AeroLMS - Create InspiritCisZam VIEW and User SYNONYM (PRODUCTION)
 *
 * Purpose: Create unified VIEW combining Helios tables + Inspirit auth table
 * Environment: PRODUCTION ONLY (Corporate SQL Server - Helios003)
 *
 * Components created:
 *   1. InspiritCisZam VIEW - Combines TabCisZam + TabCisZam_EXT + InspiritUserAuth
 *   2. User SYNONYM - Maps "User" → "InspiritCisZam" for Prisma compatibility
 *   3. INSTEAD OF triggers - Handle INSERT/UPDATE on VIEW
 *
 * Run AFTER: 02_create_inspirit_tables.sql
 * Run BEFORE: 04_create_aerolms_tables.sql
 *
 * ⚠️ CRITICAL: This is the CORE of the production architecture!
 ******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT 'AeroLMS - Creating InspiritCisZam VIEW';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

BEGIN TRY
    BEGIN TRANSACTION;

    -- ============================================================================
    -- COMPONENT 1: InspiritCisZam VIEW
    -- ============================================================================
    PRINT 'Creating/Updating InspiritCisZam VIEW...';
    PRINT '----------------------------------------';
    PRINT 'Using CREATE OR ALTER to preserve existing data';

    EXEC('
    CREATE OR ALTER VIEW [dbo].[InspiritCisZam] AS
    SELECT
        -- Primary key (from TabCisZam)
        z.ID as UserID,

        -- Authentication data (using Helios ERP terminology)
        z.Cislo,                                   -- Personal code (employee number) for login
        z.Alias,                                   -- Plain text password (for login)
        COALESCE(a.role, ''WORKER'') as role,     -- Role from InspiritUserAuth
        a.email,                                   -- Email from InspiritUserAuth (optional)
        COALESCE(a.createdAt, CURRENT_TIMESTAMP) as createdAt,
        COALESCE(a.updatedAt, CURRENT_TIMESTAMP) as updatedAt,

        -- Employee name (from TabCisZam)
        z.Jmeno,
        z.Prijmeni,

        -- Training columns (from TabCisZam_EXT - dynamically added by DB admin)
        -- Each training has 3 columns: DatumPosl, DatumPristi, Pozadovano
       e._CMMDatumPosl, e._CMMDatumPristi, e._CMMPozadovano,
        e._EDMDatumPosl, e._EDMDatumPristi, e._EDMPozadovano,
        e._EleZnaceniDatumPosl, e._EleZnaceniDatumPristi, e._EleZnaceniPozadovano,
        e._ITBezpecnostDatumPosl, e._ITBezpecnostDatumPristi, e._ITBezpecnostPozadovano,
        e._KnihaStrojeDatumPosl, e._KnihaStrojeDatumPristi, e._KnihaStrojePozadovano,
        e._KontrPrijZbozDatumPosl, e._KontrPrijZbozDatumPristi, e._KontrPrijZbozPozadovano,
        e._MerAVyhodOpotrebeniDatumPosl, e._MerAVyhodOpotrebeniDatumPristi, e._MerAVyhodOpotrebeniPozadovano,
        e._MeridlaDatumPosl, e._MeridlaDatumPristi, e._MeridlaPozadovano,
        e._MonitorVyraCMTDiluDatumPosl, e._MonitorVyraCMTDiluDatumPristi, e._MonitorVyraCMTDiluPozadovano,
        e._NakladaniLatkamiDatumPosl, e._NakladaniLatkamiDatumPristi, e._NakladaniLatkamiPozadovano,
        e._OpotrebeniNastrojuuCMTDatumPosl, e._OpotrebeniNastrojuuCMTDatumPristi, e._OpotrebeniNastrojuuCMTPozadovano,
        e._PouzitiNatsrojuDatumPosl, e._PouzitiNatsrojuDatumPristi, e._PouzitiNatsrojuPozadovano,
        e._PozdavkyEN10204DodakDatumPosl, e._PozdavkyEN10204DodakDatumPristi, e._PozdavkyEN10204DodakPozadovano,
        e._PraceKonProduktDatumPosl, e._PraceKonProduktDatumPristi, e._PraceKonProduktPozadovano,
        e._PruvodkaDatumPosl, e._PruvodkaDatumPristi, e._PruvodkaPozadovano,
        e._RazK1KDatumPosl, e._RazK1KDatumPristi, e._RazK1KPozadovano,
        e._RegulacniKartyDatumPosl, e._RegulacniKartyDatumPristi, e._RegulacniKartyPozadovano,
        e._SamokontrolaDatumPosl, e._SamokontrolaDatumPristi, e._SamokontrolaPozadovano,
        e._SeriovaCislaDatumPosl, e._SeriovaCislaDatumPristi, e._SeriovaCislaPozadovano,
        e._SymbolyvBBDatumPosl, e._SymbolyvBBDatumPristi, e._SymbolyvBBPozadovano,
        e._SystemmanagemenntuKvalityCilepodnikuDatumPosl, e._SystemmanagemenntuKvalityCilepodnikuDatumPristi, e._SystemmanagemenntuKvalityCilepodnikuPozadovano,
        e._TrideniOdpaduDatumPosl, e._TrideniOdpaduDatumPristi, e._TrideniOdpaduPozadovano,
        e._UdrzbaStrojuPracovnikyDilnyDatumPosl, e._UdrzbaStrojuPracovnikyDilnyDatumPristi, e._UdrzbaStrojuPracovnikyDilnyPozadovano,
        e._VizualniKontrolaDatumPosl, e._VizualniKontrolaDatumPristi, e._VizualniKontrolaPozadovano,
        e._VrtaniKritDilyDatumPosl, e._VrtaniKritDilyDatumPristi, e._VrtaniKritDilyPozadovano,
        e._VzorovaniDatumPosl, e._VzorovaniDatumPristi, e._VzorovaniPozadovano,
        e._ZkouskaTvrdostiDatumPosl, e._ZkouskaTvrdostiDatumPristi, e._ZkouskaTvrdostiPozadovano,
        e._ZlomeniNastrojeDatumPosl, e._ZlomeniNastrojeDatumPristi, e._ZlomeniNastrojePozadovano,
        e._ZnaceniDatumPosl, e._ZnaceniDatumPristi, e._ZnaceniPozadovano

    FROM [dbo].[TabCisZam] z
    LEFT JOIN [dbo].[TabCisZam_EXT] e ON z.ID = e.ID
    LEFT JOIN [dbo].[InspiritUserAuth] a ON z.ID = a.ID
    ');

    PRINT '✓ InspiritCisZam VIEW created';
    PRINT '  - Combines: TabCisZam + TabCisZam_EXT + InspiritUserAuth';
    PRINT '  - Authentication: Cislo and Alias from TabCisZam (Helios ERP)';
    PRINT '  - Contains: Jmeno, Prijmeni + 6 auth columns + training columns (dynamic)';
    PRINT '';

    -- ============================================================================
    -- COMPONENT 2: INSTEAD OF INSERT Trigger
    -- ============================================================================
    IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_InspiritCisZam_Insert')
    BEGIN
        DROP TRIGGER [dbo].[trg_InspiritCisZam_Insert];
    END

    PRINT 'Creating INSTEAD OF INSERT trigger...';

    EXEC('
    CREATE TRIGGER [dbo].[trg_InspiritCisZam_Insert]
    ON [dbo].[InspiritCisZam]
    INSTEAD OF INSERT
    AS
    BEGIN
        SET NOCOUNT ON;

        -- Insert or update role and email in InspiritUserAuth
        -- Cislo and Alias are managed in TabCisZam (Helios table)
        MERGE INTO [dbo].[InspiritUserAuth] AS target
        USING inserted AS source
        ON target.ID = source.UserID
        WHEN MATCHED THEN
            UPDATE SET
                role = COALESCE(source.role, ''WORKER''),
                email = source.email,
                updatedAt = CURRENT_TIMESTAMP
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (ID, role, email, createdAt, updatedAt)
            VALUES (
                source.UserID,
                COALESCE(source.role, ''WORKER''),
                source.email,
                COALESCE(source.createdAt, CURRENT_TIMESTAMP),
                COALESCE(source.updatedAt, CURRENT_TIMESTAMP)
            );

        -- Note: TabCisZam (Helios table) contains Cislo and Alias for authentication
        -- TabCisZam_EXT contains training data
        -- This trigger only manages role and email in InspiritUserAuth
    END
    ');

    PRINT '✓ INSTEAD OF INSERT trigger created';
    PRINT '';

    -- ============================================================================
    -- COMPONENT 3: INSTEAD OF UPDATE Trigger
    -- ============================================================================
    IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_InspiritCisZam_Update')
    BEGIN
        DROP TRIGGER [dbo].[trg_InspiritCisZam_Update];
    END

    PRINT 'Creating INSTEAD OF UPDATE trigger...';

    EXEC('
    CREATE TRIGGER [dbo].[trg_InspiritCisZam_Update]
    ON [dbo].[InspiritCisZam]
    INSTEAD OF UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;

        -- Update role and email in InspiritUserAuth (if exists)
        -- Cislo and Alias are in TabCisZam (Helios table)
        UPDATE a
        SET
            a.role = i.role,
            a.email = i.email,
            a.updatedAt = CURRENT_TIMESTAMP
        FROM [dbo].[InspiritUserAuth] a
        INNER JOIN inserted i ON a.ID = i.UserID
        WHERE a.ID IN (SELECT UserID FROM inserted);

        -- Insert role and email if InspiritUserAuth record doesn''t exist yet
        INSERT INTO [dbo].[InspiritUserAuth] (ID, role, email, createdAt, updatedAt)
        SELECT
            i.UserID,
            COALESCE(i.role, ''WORKER''),
            i.email,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM inserted i
        WHERE NOT EXISTS (
            SELECT 1 FROM [dbo].[InspiritUserAuth] a
            WHERE a.ID = i.UserID
        );

        -- Note: Training column updates are handled by application code
        -- (training-sync.ts updates TabCisZam_EXT directly)
        -- Cislo and Alias updates must go directly to TabCisZam
    END
    ');

    PRINT '✓ INSTEAD OF UPDATE trigger created';
    PRINT '';

    -- ============================================================================
    -- COMPONENT 4: User SYNONYM (Critical for Prisma compatibility!)
    -- ============================================================================
    IF EXISTS (SELECT * FROM sys.synonyms WHERE name = 'User')
    BEGIN
        PRINT 'Dropping existing User synonym...';
        DROP SYNONYM [dbo].[User];
    END

    PRINT 'Creating User SYNONYM → InspiritCisZam...';

    CREATE SYNONYM [dbo].[User] FOR [dbo].[InspiritCisZam];

    PRINT '✓ User SYNONYM created';
    PRINT '  - Prisma queries for [User] will resolve to InspiritCisZam VIEW';
    PRINT '  - Zero application code changes needed!';
    PRINT '';

    -- ============================================================================
    -- Commit Transaction
    -- ============================================================================
    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✓ InspiritCisZam VIEW architecture deployed!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Components created:';
    PRINT '  1. InspiritCisZam VIEW (TabCisZam + TabCisZam_EXT + InspiritUserAuth)';
    PRINT '  2. INSTEAD OF INSERT trigger';
    PRINT '  3. INSTEAD OF UPDATE trigger';
    PRINT '  4. User SYNONYM → InspiritCisZam';
    PRINT '';
    PRINT 'Next step: Run 04_create_aerolms_tables.sql';
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

    PRINT '';
    PRINT 'Error Details:';
    PRINT '  Message: ' + @ErrorMessage;
    PRINT '  Severity: ' + CAST(@ErrorSeverity AS VARCHAR);
    PRINT '  State: ' + CAST(@ErrorState AS VARCHAR);
    PRINT '';

    THROW;
END CATCH

SET NOCOUNT OFF;
