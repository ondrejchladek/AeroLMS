/*******************************************************************************
 * AeroLMS - Development: Create Helios Tables Simulation
 *
 * Purpose: Simulate Helios ERP tables (TabCisZam, TabCisZam_EXT) for local dev
 * Environment: DEVELOPMENT ONLY (Local SQL Server Express - AeroLMS database)
 *
 * This script creates physical tables that simulate Helios production tables:
 *   - TabCisZam: Employee master data (simulates Helios ERP)
 *   - TabCisZam_EXT: Training columns (simulates Helios ERP extended data)
 *
 * CRITICAL: This is for LOCAL DEVELOPMENT only!
 *           Production uses actual Helios tables - DO NOT run this on production!
 ******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT 'AeroLMS Development - Creating Helios Table Simulations';
PRINT 'Database: ' + DB_NAME();
PRINT 'Server: ' + @@SERVERNAME;
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- Safety Check: Prevent running on production
IF DB_NAME() LIKE '%Helios%'
BEGIN
    PRINT '⚠️  ERROR: This is a DEVELOPMENT script!';
    PRINT '   Do NOT run on Helios production database!';
    RAISERROR('Cannot run dev script on production database', 16, 1);
    RETURN;
END

BEGIN TRY
    BEGIN TRANSACTION;

    -- ============================================================================
    -- TABLE 1: TabCisZam (Employee Master Data - Helios Simulation)
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'TabCisZam' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating TabCisZam table (Helios employee master simulation)...';
        PRINT '----------------------------------------';

        CREATE TABLE [dbo].[TabCisZam] (
            -- Primary key
            [ID] INT IDENTITY(1,1) NOT NULL,

            -- Employee data (matching Helios structure)
            [Cislo] INT NOT NULL,              -- Personal code (employee number, used for login)
            [Jmeno] NVARCHAR(100) NOT NULL,    -- First name
            [Prijmeni] NVARCHAR(100) NOT NULL, -- Last name
            [Alias] NVARCHAR(255) NULL,        -- Password (PLAIN TEXT, Helios ERP constraint)

            -- Constraints
            CONSTRAINT [TabCisZam_pkey] PRIMARY KEY CLUSTERED ([ID]),
            CONSTRAINT [TabCisZam_Cislo_key] UNIQUE NONCLUSTERED ([Cislo])
        );

        PRINT '✓ TabCisZam created';
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT '⚠️  TabCisZam already exists (skipped)';
        PRINT '';
    END

    -- ============================================================================
    -- TABLE 2: TabCisZam_EXT (Training Columns - Helios Simulation)
    -- ============================================================================
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES
                   WHERE TABLE_NAME = 'TabCisZam_EXT' AND TABLE_SCHEMA = 'dbo')
    BEGIN
        PRINT 'Creating TabCisZam_EXT table (Training columns simulation)...';
        PRINT '----------------------------------------';
        PRINT 'This table contains training columns (dynamically added by DB admin)';
        PRINT '';

        CREATE TABLE [dbo].[TabCisZam_EXT] (
            -- Foreign key to TabCisZam
            [ID] INT NOT NULL,

            -- Training columns (dynamically added, 3 fields per training)
            -- Pattern: _{code}DatumPosl, _{code}DatumPristi, _{code}Pozadovano
            -- Note: All column names have _ (underscore) prefix!

            -- Training 1: CMM
            [_CMMDatumPosl] DATE NULL,
            [_CMMDatumPristi] DATE NULL,
            [_CMMPozadovano] BIT NULL DEFAULT 0,

            -- Training 2: EDM
            [_EDMDatumPosl] DATE NULL,
            [_EDMDatumPristi] DATE NULL,
            [_EDMPozadovano] BIT NULL DEFAULT 0,

            -- Training 3: EleZnaceni
            [_EleZnaceniDatumPosl] DATE NULL,
            [_EleZnaceniDatumPristi] DATE NULL,
            [_EleZnaceniPozadovano] BIT NULL DEFAULT 0,

            -- Training 4: ITBezpecnost
            [_ITBezpecnostDatumPosl] DATE NULL,
            [_ITBezpecnostDatumPristi] DATE NULL,
            [_ITBezpecnostPozadovano] BIT NULL DEFAULT 0,

            -- Training 5: KnihaStroje
            [_KnihaStrojeDatumPosl] DATE NULL,
            [_KnihaStrojeDatumPristi] DATE NULL,
            [_KnihaStrojePozadovano] BIT NULL DEFAULT 0,

            -- Training 6: KontrPrijZboz
            [_KontrPrijZbozDatumPosl] DATE NULL,
            [_KontrPrijZbozDatumPristi] DATE NULL,
            [_KontrPrijZbozPozadovano] BIT NULL DEFAULT 0,

            -- Training 7: MerAVyhodOpotrebeni
            [_MerAVyhodOpotrebeniDatumPosl] DATE NULL,
            [_MerAVyhodOpotrebeniDatumPristi] DATE NULL,
            [_MerAVyhodOpotrebeniPozadovano] BIT NULL DEFAULT 0,

            -- Training 8: Meridla
            [_MeridlaDatumPosl] DATE NULL,
            [_MeridlaDatumPristi] DATE NULL,
            [_MeridlaPozadovano] BIT NULL DEFAULT 0,

            -- Training 9: MonitorVyraCMTDilu
            [_MonitorVyraCMTDiluDatumPosl] DATE NULL,
            [_MonitorVyraCMTDiluDatumPristi] DATE NULL,
            [_MonitorVyraCMTDiluPozadovano] BIT NULL DEFAULT 0,

            -- Training 10: NakladaniLatkami
            [_NakladaniLatkamiDatumPosl] DATE NULL,
            [_NakladaniLatkamiDatumPristi] DATE NULL,
            [_NakladaniLatkamiPozadovano] BIT NULL DEFAULT 0,

            -- Training 11: OpotrebeniNastrojuuCMT
            [_OpotrebeniNastrojuuCMTDatumPosl] DATE NULL,
            [_OpotrebeniNastrojuuCMTDatumPristi] DATE NULL,
            [_OpotrebeniNastrojuuCMTPozadovano] BIT NULL DEFAULT 0,

            -- Training 12: PouzitiNatsroju
            [_PouzitiNatsrojuDatumPosl] DATE NULL,
            [_PouzitiNatsrojuDatumPristi] DATE NULL,
            [_PouzitiNatsrojuPozadovano] BIT NULL DEFAULT 0,

            -- Training 13: PozdavkyEN10204Dodak
            [_PozdavkyEN10204DodakDatumPosl] DATE NULL,
            [_PozdavkyEN10204DodakDatumPristi] DATE NULL,
            [_PozdavkyEN10204DodakPozadovano] BIT NULL DEFAULT 0,

            -- Training 14: PraceKonProdukt
            [_PraceKonProduktDatumPosl] DATE NULL,
            [_PraceKonProduktDatumPristi] DATE NULL,
            [_PraceKonProduktPozadovano] BIT NULL DEFAULT 0,

            -- Training 15: Pruvodka
            [_PruvodkaDatumPosl] DATE NULL,
            [_PruvodkaDatumPristi] DATE NULL,
            [_PruvodkaPozadovano] BIT NULL DEFAULT 0,

            -- Training 16: RazK1K
            [_RazK1KDatumPosl] DATE NULL,
            [_RazK1KDatumPristi] DATE NULL,
            [_RazK1KPozadovano] BIT NULL DEFAULT 0,

            -- Training 17: RegulacniKarty
            [_RegulacniKartyDatumPosl] DATE NULL,
            [_RegulacniKartyDatumPristi] DATE NULL,
            [_RegulacniKartyPozadovano] BIT NULL DEFAULT 0,

            -- Training 18: Samokontrol
            [_SamokontrolaDatumPosl] DATE NULL,
            [_SamokontrolaDatumPristi] DATE NULL,
            [_SamokontrolaPozadovano] BIT NULL DEFAULT 0,

            -- Training 19: SeriovaCisla
            [_SeriovaCislaDatumPosl] DATE NULL,
            [_SeriovaCislaDatumPristi] DATE NULL,
            [_SeriovaCislaPozadovano] BIT NULL DEFAULT 0,

            -- Training 20: SymbolyvBB
            [_SymbolyvBBDatumPosl] DATE NULL,
            [_SymbolyvBBDatumPristi] DATE NULL,
            [_SymbolyvBBPozadovano] BIT NULL DEFAULT 0,

            -- Training 21: SystemmanagemenntuKvalityCilepodniku
            [_SystemmanagemenntuKvalityCilepodnikuDatumPosl] DATE NULL,
            [_SystemmanagemenntuKvalityCilepodnikuDatumPristi] DATE NULL,
            [_SystemmanagemenntuKvalityCilepodnikuPozadovano] BIT NULL DEFAULT 0,

            -- Training 22: TrideniOdpadu
            [_TrideniOdpaduDatumPosl] DATE NULL,
            [_TrideniOdpaduDatumPristi] DATE NULL,
            [_TrideniOdpaduPozadovano] BIT NULL DEFAULT 0,

            -- Training 23: UdrzbaStrojuPracovnikyDilny
            [_UdrzbaStrojuPracovnikyDilnyDatumPosl] DATE NULL,
            [_UdrzbaStrojuPracovnikyDilnyDatumPristi] DATE NULL,
            [_UdrzbaStrojuPracovnikyDilnyPozadovano] BIT NULL DEFAULT 0,

            -- Training 24: VizualniKontrola
            [_VizualniKontrolaDatumPosl] DATE NULL,
            [_VizualniKontrolaDatumPristi] DATE NULL,
            [_VizualniKontrolaPozadovano] BIT NULL DEFAULT 0,

            -- Training 25: VrtaniKritDily
            [_VrtaniKritDilyDatumPosl] DATE NULL,
            [_VrtaniKritDilyDatumPristi] DATE NULL,
            [_VrtaniKritDilyPozadovano] BIT NULL DEFAULT 0,

            -- Training 26: Vzorovani
            [_VzorovaniDatumPosl] DATE NULL,
            [_VzorovaniDatumPristi] DATE NULL,
            [_VzorovaniPozadovano] BIT NULL DEFAULT 0,

            -- Training 27: ZkouskaTvrdosti
            [_ZkouskaTvrdostiDatumPosl] DATE NULL,
            [_ZkouskaTvrdostiDatumPristi] DATE NULL,
            [_ZkouskaTvrdostiPozadovano] BIT NULL DEFAULT 0,

            -- Training 28: ZlomeniNastroje
            [_ZlomeniNastrojeDatumPosl] DATE NULL,
            [_ZlomeniNastrojeDatumPristi] DATE NULL,
            [_ZlomeniNastrojePozadovano] BIT NULL DEFAULT 0,

            -- Training 29: Znaceni
            [_ZnaceniDatumPosl] DATE NULL,
            [_ZnaceniDatumPristi] DATE NULL,
            [_ZnaceniPozadovano] BIT NULL DEFAULT 0,

            -- Helios timestamps
            [DatumZmeny] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,

            -- Constraints
            CONSTRAINT [TabCisZam_EXT_pkey] PRIMARY KEY CLUSTERED ([ID]),
            CONSTRAINT [TabCisZam_EXT_TabCisZam_fkey]
                FOREIGN KEY ([ID])
                REFERENCES [dbo].[TabCisZam]([ID])
                ON DELETE CASCADE
                ON UPDATE NO ACTION
        );

        PRINT '✓ TabCisZam_EXT created with training columns (dynamic)';
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT '⚠️  TabCisZam_EXT already exists (skipped)';
        PRINT '';
    END

    COMMIT TRANSACTION;

    PRINT '========================================';
    PRINT '✓ Helios tables simulation created!';
    PRINT '========================================';
    PRINT '';
    PRINT 'Tables created:';
    PRINT '  1. TabCisZam (Employee master data)';
    PRINT '  2. TabCisZam_EXT (Training columns)';
    PRINT '';
    PRINT 'Next steps:';
    PRINT '  1. Run dev_02_create_inspirit_tables.sql';
    PRINT '  2. Run dev_03_create_inspirit_view.sql';
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
