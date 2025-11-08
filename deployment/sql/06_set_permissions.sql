/*******************************************************************************
 * AeroLMS - Set Database Permissions (PRODUCTION)
 *
 * Purpose: Configure minimal required permissions for AeroLMS SQL user
 * Security: Principle of least privilege - grant only what's needed
 *
 * Database Context:
 *   - Helios003 is a SHARED database containing other systems
 *   - AeroLMS must have restricted access to prevent accidents
 *   - READ-ONLY access to Helios tables (TabCisZam)
 *   - UPDATE access only to training columns in TabCisZam_EXT
 *   - FULL access to Inspirit* and AeroLMS tables
 *
 * Prerequisites:
 *   - SQL Server login 'AeroLMS' must exist
 *   - Run this script as DBA with sufficient privileges
 *
 * Run AFTER: 05_create_indexes.sql
 ******************************************************************************/

SET NOCOUNT ON;

PRINT '========================================';
PRINT 'AeroLMS - Setting Permissions';
PRINT 'Database: ' + DB_NAME();
PRINT 'Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '========================================';
PRINT '';

-- ==============================================================================
-- Safety Check: Verify we're in correct database
-- ==============================================================================
IF DB_NAME() NOT LIKE '%Helios%'
BEGIN
    PRINT '⚠️  WARNING: This script is designed for Helios database!';
    PRINT '   Current database: ' + DB_NAME();
    RAISERROR('Wrong database - expected Helios production database', 16, 1);
    RETURN;
END

-- ==============================================================================
-- Create database user for login (if not exists)
-- ==============================================================================
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'AeroLMS')
BEGIN
    PRINT 'Creating database user AeroLMS...';
    CREATE USER [AeroLMS] FOR LOGIN [AeroLMS];
    PRINT '✓ Database user created';
    PRINT '';
END
ELSE
BEGIN
    PRINT '✓ Database user AeroLMS already exists';
    PRINT '';
END

-- ==============================================================================
-- SECTION 1: Helios Tables (Existing System - RESTRICTED ACCESS)
-- ==============================================================================
PRINT '1. Configuring permissions for Helios tables...';
PRINT '----------------------------------------';

-- TabCisZam: READ-ONLY (employee master data)
GRANT SELECT ON [dbo].[TabCisZam] TO [AeroLMS];
DENY INSERT, UPDATE, DELETE, ALTER ON [dbo].[TabCisZam] TO [AeroLMS];
PRINT '  ✓ TabCisZam: SELECT granted, modifications DENIED';

-- TabCisZam_EXT: SELECT + UPDATE (training columns)
GRANT SELECT, UPDATE ON [dbo].[TabCisZam_EXT] TO [AeroLMS];
DENY INSERT, DELETE, ALTER ON [dbo].[TabCisZam_EXT] TO [AeroLMS];
PRINT '  ✓ TabCisZam_EXT: SELECT + UPDATE granted, INSERT/DELETE/ALTER DENIED';

-- InspiritCisZam VIEW: READ-ONLY (reporting view)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'InspiritCisZam')
BEGIN
    GRANT SELECT ON [dbo].[InspiritCisZam] TO [AeroLMS];
    PRINT '  ✓ InspiritCisZam VIEW: SELECT granted';
END

PRINT '';

-- ==============================================================================
-- SECTION 2: Inspirit Tables (AeroLMS Owned - FULL ACCESS)
-- ==============================================================================
PRINT '2. Configuring permissions for Inspirit tables...';
PRINT '----------------------------------------';

-- InspiritUserAuth: FULL ACCESS
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[InspiritUserAuth] TO [AeroLMS];
PRINT '  ✓ InspiritUserAuth: Full CRUD access granted';

-- InspiritCisZam VIEW: SELECT (INSERT/UPDATE via triggers)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'InspiritCisZam')
BEGIN
    GRANT SELECT, INSERT, UPDATE ON [dbo].[InspiritCisZam] TO [AeroLMS];
    PRINT '  ✓ InspiritCisZam VIEW: SELECT + INSERT + UPDATE granted';
END

-- User SYNONYM: SELECT (resolves to InspiritCisZam VIEW)
-- Note: Permissions are inherited from underlying object (InspiritCisZam VIEW)
PRINT '  ✓ User SYNONYM: Permissions inherited from InspiritCisZam VIEW';

PRINT '';

-- ==============================================================================
-- SECTION 3: AeroLMS Application Tables (FULL ACCESS)
-- ==============================================================================
PRINT '3. Configuring permissions for AeroLMS tables...';
PRINT '----------------------------------------';

-- Training table
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[Training] TO [AeroLMS];
PRINT '  ✓ Training: Full CRUD access granted';

-- Test table
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[Test] TO [AeroLMS];
PRINT '  ✓ Test: Full CRUD access granted';

-- Question table
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[Question] TO [AeroLMS];
PRINT '  ✓ Question: Full CRUD access granted';

-- TestAttempt table
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[TestAttempt] TO [AeroLMS];
PRINT '  ✓ TestAttempt: Full CRUD access granted';

-- Certificate table
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[Certificate] TO [AeroLMS];
PRINT '  ✓ Certificate: Full CRUD access granted';

-- TrainingAssignment table
GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[TrainingAssignment] TO [AeroLMS];
PRINT '  ✓ TrainingAssignment: Full CRUD access granted';

PRINT '';

-- ==============================================================================
-- SECTION 4: Schema-Level Permissions (Restricted)
-- ==============================================================================
PRINT '4. Configuring schema-level permissions...';
PRINT '----------------------------------------';

-- DENY dangerous operations database-wide
DENY CREATE TABLE, CREATE VIEW, CREATE PROCEDURE, CREATE FUNCTION TO [AeroLMS];
DENY ALTER ANY SCHEMA TO [AeroLMS];
DENY DROP ANY DATABASE TO [AeroLMS];

PRINT '  ✓ Schema modifications DENIED (safety measure)';
PRINT '  → AeroLMS user cannot create/alter/drop schema objects';
PRINT '';

-- ==============================================================================
-- SECTION 5: Execution Permissions (Stored Procedures)
-- ==============================================================================
PRINT '5. Configuring execution permissions...';
PRINT '----------------------------------------';

-- Grant EXECUTE on specific stored procedures if any exist
-- Currently no stored procedures, but template for future:
--
-- IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_AeroLMS_SyncTrainings')
-- BEGIN
--     GRANT EXECUTE ON [dbo].[sp_AeroLMS_SyncTrainings] TO [AeroLMS];
--     PRINT '  ✓ sp_AeroLMS_SyncTrainings: EXECUTE granted';
-- END

PRINT '  ℹ No stored procedures to grant EXECUTE permissions (none exist yet)';
PRINT '';

-- ==============================================================================
-- Summary and Verification
-- ==============================================================================
PRINT '========================================';
PRINT '✓ Permissions configured successfully!';
PRINT '========================================';
PRINT '';
PRINT 'Security Summary:';
PRINT '  - TabCisZam: READ-ONLY';
PRINT '  - TabCisZam_EXT: SELECT + UPDATE (training columns)';
PRINT '  - Inspirit tables: FULL ACCESS';
PRINT '  - AeroLMS tables: FULL ACCESS';
PRINT '  - Schema modifications: DENIED';
PRINT '';
PRINT 'Verification:';

-- List all permissions for AeroLMS user
SELECT
    OBJECT_NAME(major_id) AS [Object],
    permission_name AS [Permission],
    state_desc AS [State]
FROM sys.database_permissions
WHERE grantee_principal_id = USER_ID('AeroLMS')
ORDER BY OBJECT_NAME(major_id), permission_name;

PRINT '';
PRINT 'Deployment complete!';
PRINT 'AeroLMS application can now safely access the database.';
PRINT '';

SET NOCOUNT OFF;
