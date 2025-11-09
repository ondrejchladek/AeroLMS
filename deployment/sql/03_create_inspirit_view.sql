/*******************************************************************************
 * AeroLMS - Augment InspiritCisZam VIEW with Auth Columns (PRODUCTION)
 *
 * Purpose: Extend existing VIEW with InspiritUserAuth columns (role, email)
 * Environment: PRODUCTION ONLY (Corporate SQL Server - Helios003)
 *
 * Changes made:
 *   1. DROP existing InspiritCisZam VIEW
 *   2. CREATE VIEW with exact same structure + 4 auth columns
 *   3. Add LEFT JOIN to InspiritUserAuth
 *   4. Preserve ALL existing columns, calculated fields, WHERE, ORDER BY
 *
 * Components created:
 *   1. InspiritCisZam VIEW - Existing structure + InspiritUserAuth columns
 *   2. INSTEAD OF triggers - Handle INSERT/UPDATE on VIEW
 *
 * Run AFTER: 02_create_inspirit_tables.sql
 * Run BEFORE: 04_create_aerolms_tables.sql
 *
 * ⚠️ CRITICAL: Preserves COMPLETE existing VIEW structure, only adds auth columns!
 ******************************************************************************/

USE Helios003;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

PRINT '========================================';
PRINT 'AeroLMS - Augmenting InspiritCisZam VIEW';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ============================================================================
-- COMPONENT 1: InspiritCisZam VIEW (Augmented with Auth Columns)
-- ============================================================================
PRINT 'Augmenting InspiritCisZam VIEW with auth columns...';
PRINT '(using CREATE OR ALTER - preserves existing connections)';
PRINT '----------------------------------------';
GO

-- CREATE OR ALTER VIEW - preserves existing VIEW, just adds auth columns
CREATE OR ALTER VIEW dbo.InspiritCisZam AS
    SELECT TOP (100) PERCENT
        -- ====================================================================
        -- AUTH COLUMNS (ADDED) - From InspiritUserAuth
        -- ====================================================================
        COALESCE(auth.role, 'WORKER') as role,
        auth.email,
        COALESCE(auth.createdAt, CURRENT_TIMESTAMP) as createdAt,
        COALESCE(auth.updatedAt, CURRENT_TIMESTAMP) as updatedAt,

        -- ====================================================================
        -- EXISTING PRODUCTION VIEW COLUMNS (PRESERVED COMPLETELY)
        -- ====================================================================
        dbo.TabCisZam.Cislo,
        dbo.TabCisZam.ID,
        dbo.TabCisZam.Jmeno,
        dbo.TabCisZam.Prijmeni,
        dbo.TabCisZam.Alias,

        -- Calculated status columns (HeIQ system - all 30+ training codes)
        (CASE WHEN ((SELECT _ZnaceniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _ZnaceniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _ZnaceniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _ZnaceniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _ZnaceniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _ZnaceniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _ZnaceniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__ZnaceniDatumPristi,
        (CASE WHEN ((SELECT _VizualniKontrolaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _VizualniKontrolaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _VizualniKontrolaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _VizualniKontrolaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _VizualniKontrolaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _VizualniKontrolaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _VizualniKontrolaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__VizualniKontrolaDatumPristi,
        (CASE WHEN ((SELECT _CMMDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _CMMDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _CMMPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _CMMDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _CMMPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _CMMDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _CMMPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__CMMDatumPristi,
        (CASE WHEN ((SELECT _EDMDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 12, (SELECT _EDMDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _EDMPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _EDMDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _EDMPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _EDMDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _EDMPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__EDMDatumPristi,
        (CASE WHEN ((SELECT _EleZnaceniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _EleZnaceniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _EleZnaceniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _EleZnaceniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _EleZnaceniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _EleZnaceniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _EleZnaceniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__EleZnaceniDatumPristi,
        (CASE WHEN ((SELECT _KnihaStrojeDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _KnihaStrojeDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _KnihaStrojePozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _KnihaStrojeDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _KnihaStrojePozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _KnihaStrojeDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _KnihaStrojePozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__KnihaStrojeDatumPristi,
        (CASE WHEN ((SELECT _MeridlaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _MeridlaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _MeridlaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _MeridlaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _MeridlaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _MeridlaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _MeridlaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__MeridlaDatumPristi,
        (CASE WHEN ((SELECT _MonitorVyraCMTDiluDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 12, (SELECT _MonitorVyraCMTDiluDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _MonitorVyraCMTDiluPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _MonitorVyraCMTDiluDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _MonitorVyraCMTDiluPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _MonitorVyraCMTDiluDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _MonitorVyraCMTDiluPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__MonitorVyraCMTDiluDatumPristi,
        (CASE WHEN ((SELECT _OpotrebeniNastrojuuCMTDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _OpotrebeniNastrojuuCMTDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _OpotrebeniNastrojuuCMTPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _OpotrebeniNastrojuuCMTDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _OpotrebeniNastrojuuCMTPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _OpotrebeniNastrojuuCMTDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _OpotrebeniNastrojuuCMTPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__OpotrebeniNastrojuuCMTDatumPristi,
        (CASE WHEN ((SELECT _PouzitiNatsrojuDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PouzitiNatsrojuDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _PouzitiNatsrojuPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PouzitiNatsrojuDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _PouzitiNatsrojuPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PouzitiNatsrojuDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _PouzitiNatsrojuPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__PouzitiNatsrojuDatumPristi,
        (CASE WHEN ((SELECT _PraceKonProduktDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 36, (SELECT _PraceKonProduktDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _PraceKonProduktPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 36, (SELECT _PraceKonProduktDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _PraceKonProduktPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 36, (SELECT _PraceKonProduktDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _PraceKonProduktPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__PraceKonProduktDatumPristi,
        (CASE WHEN ((SELECT _PruvodkaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PruvodkaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _PruvodkaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PruvodkaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _PruvodkaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PruvodkaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _PruvodkaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__PruvodkaDatumPristi,
        (CASE WHEN ((SELECT _RegulacniKartyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _RegulacniKartyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _RegulacniKartyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _RegulacniKartyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _RegulacniKartyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _RegulacniKartyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _RegulacniKartyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__RegulacniKartyDatumPristi,
        (CASE WHEN ((SELECT _SamokontrolaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SamokontrolaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _SamokontrolaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SamokontrolaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _SamokontrolaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SamokontrolaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _SamokontrolaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__SamokontrolaDatumPristi,
        (CASE WHEN ((SELECT _SeriovaCislaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SeriovaCislaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _SeriovaCislaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SeriovaCislaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _SeriovaCislaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SeriovaCislaDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _SeriovaCislaPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__SeriovaCislaDatumPristi,
        (CASE WHEN ((SELECT _SymbolyvBBDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SymbolyvBBDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _SymbolyvBBPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SymbolyvBBDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _SymbolyvBBPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _SymbolyvBBDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _SymbolyvBBPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__SymbolyvBBDatumPristi,
        (CASE WHEN ((SELECT _SystemmanagemenntuKvalityCilepodnikuDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 12, (SELECT _SystemmanagemenntuKvalityCilepodnikuDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _SystemmanagemenntuKvalityCilepodnikuPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _SystemmanagemenntuKvalityCilepodnikuDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _SystemmanagemenntuKvalityCilepodnikuPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _SystemmanagemenntuKvalityCilepodnikuDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _SystemmanagemenntuKvalityCilepodnikuPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__SystemmanagemenntuKvalityCilepodnikuDatumPristi,
        (CASE WHEN ((SELECT _UdrzbaStrojuPracovnikyDilnyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _UdrzbaStrojuPracovnikyDilnyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _UdrzbaStrojuPracovnikyDilnyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _UdrzbaStrojuPracovnikyDilnyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _UdrzbaStrojuPracovnikyDilnyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _UdrzbaStrojuPracovnikyDilnyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _UdrzbaStrojuPracovnikyDilnyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__UdrzbaStrojuPracovnikyDilnyDatumPristi,
        (CASE WHEN ((SELECT _VzorovaniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 12, (SELECT _VzorovaniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _VzorovaniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _VzorovaniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _VzorovaniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _VzorovaniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _VzorovaniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__VzorovaniDatumPristi,
        (CASE WHEN ((SELECT _ZlomeniNastrojeDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 12, (SELECT _ZlomeniNastrojeDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _ZlomeniNastrojePozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _ZlomeniNastrojeDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _ZlomeniNastrojePozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _ZlomeniNastrojeDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _ZlomeniNastrojePozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__ZlomeniNastrojeDatumPristi,
        (CASE WHEN ((SELECT _ZkouskaTvrdostiDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _ZkouskaTvrdostiDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _ZkouskaTvrdostiPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _ZkouskaTvrdostiDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _ZkouskaTvrdostiPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _ZkouskaTvrdostiDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _ZkouskaTvrdostiPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__ZkouskaTvrdostiDatumPristi,
        (CASE WHEN ((SELECT _VrtaniKritDilyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 12, (SELECT _VrtaniKritDilyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _VrtaniKritDilyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _VrtaniKritDilyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _VrtaniKritDilyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _VrtaniKritDilyDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _VrtaniKritDilyPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__VrtaniKritDilyDatumPristi,
        (CASE WHEN ((SELECT _PozdavkyEN10204DodakDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PozdavkyEN10204DodakDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _PozdavkyEN10204DodakPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PozdavkyEN10204DodakDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _PozdavkyEN10204DodakPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _PozdavkyEN10204DodakDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _PozdavkyEN10204DodakPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__PozdavkyEN10204DodakDatumPristi,
        (CASE WHEN ((SELECT _MerAVyhodOpotrebeniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _MerAVyhodOpotrebeniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _MerAVyhodOpotrebeniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _MerAVyhodOpotrebeniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _MerAVyhodOpotrebeniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _MerAVyhodOpotrebeniDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _MerAVyhodOpotrebeniPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__MerAVyhodOpotrebeniDatumPristi,
        (CASE WHEN ((SELECT _ITBezpecnostDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 12, (SELECT _ITBezpecnostDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _ITBezpecnostPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _ITBezpecnostDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _ITBezpecnostPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 12, (SELECT _ITBezpecnostDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _ITBezpecnostPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__ITBezpecnostDatumPristi,
        (CASE WHEN ((SELECT _NakladaniLatkamiDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 36, (SELECT _NakladaniLatkamiDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _NakladaniLatkamiPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 36, (SELECT _NakladaniLatkamiDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _NakladaniLatkamiPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 36, (SELECT _NakladaniLatkamiDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _NakladaniLatkamiPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__NakladaniLatkamiDatumPristi,
        (CASE WHEN ((SELECT _TrideniOdpaduDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 36, (SELECT _TrideniOdpaduDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _TrideniOdpaduPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 36, (SELECT _TrideniOdpaduDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _TrideniOdpaduPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 36, (SELECT _TrideniOdpaduDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _TrideniOdpaduPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__TrideniOdpaduDatumPristi,
        (CASE WHEN ((SELECT _RazK1KDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 24, (SELECT _RazK1KDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _RazK1KPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _RazK1KDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _RazK1KPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 24, (SELECT _RazK1KDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _RazK1KPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__RazK1KDatumPristi,
        (CASE WHEN ((SELECT _KontrPrijZbozDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) IS NULL OR (datediff(day, getdate(), DATEADD(month, 36, (SELECT _KontrPrijZbozDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 0) AND (SELECT _KontrPrijZbozPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 1 WHEN (datediff(day, getdate(), DATEADD(month, 36, (SELECT _KontrPrijZbozDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) <= 30 AND (SELECT _KontrPrijZbozPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 65535 WHEN (datediff(day, getdate(), DATEADD(month, 36, (SELECT _KontrPrijZbozDatumPosl FROM TabCisZam_EXT WHERE ID = TabCisZam.ID)))) >= 31 AND (SELECT _KontrPrijZbozPozadovano FROM TabCisZam_EXT WHERE ID = TabCisZam.ID) = 1 THEN 2 ELSE NULL END) AS _HeIQ_CB__KontrPrijZbozDatumPristi,

        dbo.TabCisZam.Alias AS Expr1,
        TabCisZam_EXT_1._DruhPozice,

        -- DATEADD calculated columns for DatumPristi dates
        DATEADD(month, 24, (SELECT _CMMDatumPosl FROM dbo.TabCisZam_EXT WHERE (ID = dbo.TabCisZam.ID))) AS _CMMDatumPristi,
        DATEADD(month, 12, (SELECT _EDMDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_29 WHERE (ID = dbo.TabCisZam.ID))) AS _EDMDatumPristi,
        DATEADD(month, 24, (SELECT _VizualniKontrolaDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_28 WHERE (ID = dbo.TabCisZam.ID))) AS _VizualniKontrolaDatumPristi,
        DATEADD(month, 24, (SELECT _ZnaceniDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_27 WHERE (ID = dbo.TabCisZam.ID))) AS _ZnaceniDatumPristi,
        DATEADD(month, 12, (SELECT _ZlomeniNastrojeDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_26 WHERE (ID = dbo.TabCisZam.ID))) AS _ZlomeniNastrojeDatumPristi,
        DATEADD(month, 12, (SELECT _VzorovaniDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_25 WHERE (ID = dbo.TabCisZam.ID))) AS _VzorovaniDatumPristi,
        DATEADD(month, 24, (SELECT _UdrzbaStrojuPracovnikyDilnyDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_24 WHERE (ID = dbo.TabCisZam.ID))) AS _UdrzbaStrojuPracovnikyDilnyDatumPristi,
        DATEADD(month, 12, (SELECT _SystemmanagemenntuKvalityCilepodnikuDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_23 WHERE (ID = dbo.TabCisZam.ID))) AS _SystemmanagemenntuKvalityCilepodnikuDatumPristi,
        DATEADD(month, 24, (SELECT _SymbolyvBBDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_22 WHERE (ID = dbo.TabCisZam.ID))) AS _SymbolyvBBDatumPristi,
        DATEADD(month, 24, (SELECT _SeriovaCislaDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_21 WHERE (ID = dbo.TabCisZam.ID))) AS _SeriovaCislaDatumPristi,
        DATEADD(month, 24, (SELECT _SamokontrolaDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_20 WHERE (ID = dbo.TabCisZam.ID))) AS _SamokontrolaDatumPristi,
        DATEADD(month, 24, (SELECT _RegulacniKartyDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_19 WHERE (ID = dbo.TabCisZam.ID))) AS _RegulacniKartyDatumPristi,
        DATEADD(month, 24, (SELECT _PruvodkaDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_18 WHERE (ID = dbo.TabCisZam.ID))) AS _PruvodkaDatumPristi,
        DATEADD(month, 36, (SELECT _PraceKonProduktDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_17 WHERE (ID = dbo.TabCisZam.ID))) AS _PraceKonProduktDatumPristi,
        DATEADD(month, 24, (SELECT _PouzitiNatsrojuDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_16 WHERE (ID = dbo.TabCisZam.ID))) AS _PouzitiNatsrojuDatumPristi,
        DATEADD(month, 24, (SELECT _OpotrebeniNastrojuuCMTDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_15 WHERE (ID = dbo.TabCisZam.ID))) AS _OpotrebeniNastrojuuCMTDatumPristi,
        DATEADD(month, 12, (SELECT _MonitorVyraCMTDiluDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_14 WHERE (ID = dbo.TabCisZam.ID))) AS _MonitorVyraCMTDiluDatumPristi,
        DATEADD(month, 24, (SELECT _MeridlaDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_13 WHERE (ID = dbo.TabCisZam.ID))) AS _MeridlaDatumPristi,
        DATEADD(month, 24, (SELECT _KnihaStrojeDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_12 WHERE (ID = dbo.TabCisZam.ID))) AS _KnihaStrojeDatumPristi,
        DATEADD(month, 24, (SELECT _MerAVyhodOpotrebeniDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_11 WHERE (ID = dbo.TabCisZam.ID))) AS _MerAVyhodOpotrebeniDatumPristi,
        DATEADD(month, 24, (SELECT _PozdavkyEN10204DodakDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_10 WHERE (ID = dbo.TabCisZam.ID))) AS _PozdavkyEN10204DodakDatumPristi,
        DATEADD(month, 12, (SELECT _VrtaniKritDilyDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_9 WHERE (ID = dbo.TabCisZam.ID))) AS _VrtaniKritDilyDatumPristi,
        DATEADD(month, 24, (SELECT _ZkouskaTvrdostiDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_8 WHERE (ID = dbo.TabCisZam.ID))) AS _ZkouskaTvrdostiDatumPristi,
        DATEADD(month, 24, (SELECT _EleZnaceniDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_7 WHERE (ID = dbo.TabCisZam.ID))) AS _EleZnaceniDatumPristi,
        DATEADD(month, 36, (SELECT _TrideniOdpaduDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_6 WHERE (ID = dbo.TabCisZam.ID))) AS _TrideniOdpaduDatumPristi,
        DATEADD(month, 36, (SELECT _NakladaniLatkamiDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_5 WHERE (ID = dbo.TabCisZam.ID))) AS _NakladaniLatkamiDatumPristi,
        DATEADD(month, 12, (SELECT _ITBezpecnostDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_4 WHERE (ID = dbo.TabCisZam.ID))) AS _ITBezpecnostDatumPristi,
        DATEADD(month, 24, (SELECT _RazK1KDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_3 WHERE (ID = dbo.TabCisZam.ID))) AS _RazK1KDatumPristi,
        DATEADD(month, 36, (SELECT _KontrPrijZbozDatumPosl FROM dbo.TabCisZam_EXT AS TabCisZam_EXT_2 WHERE (ID = dbo.TabCisZam.ID))) AS _KontrPrijZbozDatumPristi,

        -- Actual training columns from TabCisZam_EXT (Pozadovano and DatumPosl)
        ISNULL(TabCisZam_EXT_1._CMMPozadovano, 0) AS _CMMPozadovano,
        TabCisZam_EXT_1._CMMDatumPosl,
        ISNULL(TabCisZam_EXT_1._EDMPozadovano, 0) AS _EDMPozadovano,
        TabCisZam_EXT_1._EDMDatumPosl,
        ISNULL(TabCisZam_EXT_1._VizualniKontrolaPozadovano, 0) AS _VizualniKontrolaPozadovano,
        TabCisZam_EXT_1._VizualniKontrolaDatumPosl,
        ISNULL(TabCisZam_EXT_1._ZnaceniPozadovano, 0) AS _ZnaceniPozadovano,
        TabCisZam_EXT_1._ZnaceniDatumPosl,
        ISNULL(TabCisZam_EXT_1._MonitorVyraCMTDiluPozadovano, 0) AS _MonitorVyraCMTDiluPozadovano,
        TabCisZam_EXT_1._MonitorVyraCMTDiluDatumPosl,
        ISNULL(TabCisZam_EXT_1._SamokontrolaPozadovano, 0) AS _SamokontrolaPozadovano,
        TabCisZam_EXT_1._SamokontrolaDatumPosl,
        ISNULL(TabCisZam_EXT_1._OpotrebeniNastrojuuCMTPozadovano, 0) AS _OpotrebeniNastrojuuCMTPozadovano,
        TabCisZam_EXT_1._OpotrebeniNastrojuuCMTDatumPosl,
        ISNULL(TabCisZam_EXT_1._ZlomeniNastrojePozadovano, 0) AS _ZlomeniNastrojePozadovano,
        TabCisZam_EXT_1._ZlomeniNastrojeDatumPosl,
        ISNULL(TabCisZam_EXT_1._SystemmanagemenntuKvalityCilepodnikuPozadovano, 0) AS _SystemmanagemenntuKvalityCilepodnikuPozadovano,
        TabCisZam_EXT_1._SystemmanagemenntuKvalityCilepodnikuDatumPosl,
        ISNULL(TabCisZam_EXT_1._RegulacniKartyPozadovano, 0) AS _RegulacniKartyPozadovano,
        TabCisZam_EXT_1._RegulacniKartyDatumPosl,
        ISNULL(TabCisZam_EXT_1._SymbolyvBBPozadovano, 0) AS _SymbolyvBBPozadovano,
        TabCisZam_EXT_1._SymbolyvBBDatumPosl,
        ISNULL(TabCisZam_EXT_1._KnihaStrojePozadovano, 0) AS _KnihaStrojePozadovano,
        TabCisZam_EXT_1._KnihaStrojeDatumPosl,
        ISNULL(TabCisZam_EXT_1._PruvodkaPozadovano, 0) AS _PruvodkaPozadovano,
        TabCisZam_EXT_1._PruvodkaDatumPosl,
        ISNULL(TabCisZam_EXT_1._MeridlaPozadovano, 0) AS _MeridlaPozadovano,
        TabCisZam_EXT_1._MeridlaDatumPosl,
        ISNULL(TabCisZam_EXT_1._UdrzbaStrojuPracovnikyDilnyPozadovano, 0) AS _UdrzbaStrojuPracovnikyDilnyPozadovano,
        TabCisZam_EXT_1._UdrzbaStrojuPracovnikyDilnyDatumPosl,
        ISNULL(TabCisZam_EXT_1._VzorovaniPozadovano, 0) AS _VzorovaniPozadovano,
        TabCisZam_EXT_1._VzorovaniDatumPosl,
        ISNULL(TabCisZam_EXT_1._PouzitiNatsrojuPozadovano, 0) AS _PouzitiNatsrojuPozadovano,
        TabCisZam_EXT_1._PouzitiNatsrojuDatumPosl,
        ISNULL(TabCisZam_EXT_1._SeriovaCislaPozadovano, 0) AS _SeriovaCislaPozadovano,
        TabCisZam_EXT_1._SeriovaCislaDatumPosl,
        ISNULL(TabCisZam_EXT_1._EleZnaceniPozadovano, 0) AS _EleZnaceniPozadovano,
        TabCisZam_EXT_1._EleZnaceniDatumPosl,
        ISNULL(TabCisZam_EXT_1._PraceKonProduktPozadovano, 0) AS _PraceKonProduktPozadovano,
        TabCisZam_EXT_1._PraceKonProduktDatumPosl,
        ISNULL(TabCisZam_EXT_1._PozdavkyEN10204DodakPozadovano, 0) AS _PozdavkyEN10204DodakPozadovano,
        TabCisZam_EXT_1._PozdavkyEN10204DodakDatumPosl,
        ISNULL(TabCisZam_EXT_1._VrtaniKritDilyPozadovano, 0) AS _VrtaniKritDilyPozadovano,
        TabCisZam_EXT_1._VrtaniKritDilyDatumPosl,
        ISNULL(TabCisZam_EXT_1._ZkouskaTvrdostiPozadovano, 0) AS _ZkouskaTvrdostiPozadovano,
        TabCisZam_EXT_1._ZkouskaTvrdostiDatumPosl,
        ISNULL(TabCisZam_EXT_1._MerAVyhodOpotrebeniPozadovano, 0) AS _MerAVyhodOpotrebeniPozadovano,
        TabCisZam_EXT_1._MerAVyhodOpotrebeniDatumPosl,
        ISNULL(TabCisZam_EXT_1._TrideniOdpaduPozadovano, 0) AS _TrideniOdpaduPozadovano,
        TabCisZam_EXT_1._TrideniOdpaduDatumPosl,
        ISNULL(TabCisZam_EXT_1._NakladaniLatkamiPozadovano, 0) AS _NakladaniLatkamiPozadovano,
        TabCisZam_EXT_1._NakladaniLatkamiDatumPosl,
        ISNULL(TabCisZam_EXT_1._ITBezpecnostPozadovano, 0) AS _ITBezpecnostPozadovano,
        TabCisZam_EXT_1._ITBezpecnostDatumPosl,
        ISNULL(TabCisZam_EXT_1._RazK1KPozadovano, 0) AS _RazK1KPozadovano,
        TabCisZam_EXT_1._RazK1KDatumPosl,
        ISNULL(TabCisZam_EXT_1._KontrPrijZbozPozadovano, 0) AS _KontrPrijZbozPozadovano,
        TabCisZam_EXT_1._KontrPrijZbozDatumPosl

    FROM dbo.TabCisZam
    LEFT OUTER JOIN dbo.TabCisZam_EXT AS TabCisZam_EXT_1 ON TabCisZam_EXT_1.ID = dbo.TabCisZam.ID
    LEFT JOIN [dbo].[InspiritUserAuth] auth ON auth.ID = dbo.TabCisZam.ID

    WHERE (((CASE WHEN EXISTS (SELECT * FROM TabZamMzd WHERE ZamestnanecId = TabCisZam.ID) THEN CASE WHEN EXISTS (SELECT * FROM TabZamMzd WHERE IdObdobi = (SELECT id FROM TabMzdObd WHERE stav = 1) AND ZamestnanecId = TabCisZam.ID) THEN (SELECT StavES FROM TabZamMzd WHERE IdObdobi = (SELECT id FROM TabMzdObd WHERE stav = 1) AND ZamestnanecId = TabCisZam.ID) WHEN EXISTS (SELECT m.* FROM TabZamMzd m JOIN TabMzdObd o1 ON o1.IdObdobi = m.IdObdobi LEFT OUTER JOIN TabMzdObd o2 ON o2.IdObdobi = (SELECT id FROM TabMzdObd WHERE stav = 1) WHERE ((o1.Rok < o2.Rok) OR ((o1.Rok = o2.Rok) AND (o1.Mesic < o2.Mesic))) AND m.ZamestnanecId = TabCisZam.ID) THEN 4 ELSE 10 END ELSE CASE WHEN EXISTS (SELECT * FROM TabMzNastupPP WHERE ZamestnanecId = TabCisZam.ID) THEN 5 ELSE 6 END END)) = 0) AND ((SELECT DruhPP FROM dbo.TabZamMzd WHERE (IdObdobi = (SELECT ID FROM dbo.TabMzdObd WHERE (Stav = 1))) AND (ZamestnanecId = dbo.TabCisZam.ID)) = 0 OR (SELECT DruhPP FROM dbo.TabZamMzd AS TabZamMzd_1 WHERE (IdObdobi = (SELECT ID FROM dbo.TabMzdObd AS TabMzdObd_1 WHERE (Stav = 1))) AND (ZamestnanecId = dbo.TabCisZam.ID)) = 1) OR (dbo.TabCisZam.Cislo = 381) OR (dbo.TabCisZam.Cislo = 429) OR (dbo.TabCisZam.Cislo = 900024)

    ORDER BY dbo.TabCisZam.Alias;
GO

PRINT '✓ InspiritCisZam VIEW created';
PRINT '  - Preserved COMPLETE existing VIEW structure';
PRINT '  - Added 4 auth columns: role, email, createdAt, updatedAt';
PRINT '  - Added LEFT JOIN to InspiritUserAuth';
PRINT '  - Contains: 30+ training codes with all calculated fields';
PRINT '';

-- ============================================================================
-- COMPONENT 2: INSTEAD OF INSERT Trigger
-- ============================================================================
PRINT 'Creating/updating INSTEAD OF INSERT trigger...';
GO

CREATE OR ALTER TRIGGER [dbo].[trg_InspiritCisZam_Insert]
    ON [dbo].[InspiritCisZam]
    INSTEAD OF INSERT
    AS
    BEGIN
        SET NOCOUNT ON;

        -- Insert or update role and email in InspiritUserAuth
        -- Cislo and Alias are managed in TabCisZam (Helios table)
        MERGE INTO [dbo].[InspiritUserAuth] AS target
        USING inserted AS source
        ON target.ID = source.ID
        WHEN MATCHED THEN
            UPDATE SET
                role = COALESCE(source.role, 'WORKER'),
                email = source.email,
                updatedAt = CURRENT_TIMESTAMP
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (ID, role, email, createdAt, updatedAt)
            VALUES (
                source.ID,
                COALESCE(source.role, 'WORKER'),
                source.email,
                COALESCE(source.createdAt, CURRENT_TIMESTAMP),
                COALESCE(source.updatedAt, CURRENT_TIMESTAMP)
            );

        -- Note: TabCisZam (Helios table) contains Cislo and Alias for authentication
        -- TabCisZam_EXT contains training data
        -- This trigger only manages role and email in InspiritUserAuth
    END
GO

PRINT '✓ INSTEAD OF INSERT trigger created';
PRINT '';

-- ============================================================================
-- COMPONENT 3: INSTEAD OF UPDATE Trigger
-- ============================================================================
PRINT 'Creating/updating INSTEAD OF UPDATE trigger...';
GO

CREATE OR ALTER TRIGGER [dbo].[trg_InspiritCisZam_Update]
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
        INNER JOIN inserted i ON a.ID = i.ID
        WHERE a.ID IN (SELECT ID FROM inserted);

        -- Insert role and email if InspiritUserAuth record doesn't exist yet
        INSERT INTO [dbo].[InspiritUserAuth] (ID, role, email, createdAt, updatedAt)
        SELECT
            i.ID,
            COALESCE(i.role, 'WORKER'),
            i.email,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM inserted i
        WHERE NOT EXISTS (
            SELECT 1 FROM [dbo].[InspiritUserAuth] a
            WHERE a.ID = i.ID
        );

        -- Note: Training column updates are handled by application code
        -- (training-sync.ts updates TabCisZam_EXT directly)
        -- Cislo and Alias updates must go directly to TabCisZam
    END
GO

PRINT '✓ INSTEAD OF UPDATE trigger created';
PRINT '';

PRINT '========================================';
PRINT '✓ InspiritCisZam VIEW augmented successfully!';
PRINT '========================================';
PRINT '';
PRINT 'Components created:';
PRINT '  1. InspiritCisZam VIEW (complete existing structure + auth columns)';
PRINT '  2. INSTEAD OF INSERT trigger';
PRINT '  3. INSTEAD OF UPDATE trigger';
PRINT '';
PRINT 'Next step: Run 04_create_aerolms_tables.sql';
PRINT '';

SET NOCOUNT OFF;
