/**
 * Prisma seed file
 * Seeds the database with initial development data
 *
 * Architecture:
 * 1. Insert into TabCisZam (Helios employee master - direct SQL)
 * 2. Add training columns to TabCisZam_EXT (simulates production columns)
 * 3. Insert training data into TabCisZam_EXT
 * 4. Upsert User via Prisma (INSTEAD OF trigger routes to InspiritUserAuth)
 * 5. Training sync auto-creates InspiritTraining records on app startup
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  console.log('');

  // ============================================================================
  // CLEANUP - Delete old data
  // ============================================================================
  console.log('🧹 Cleaning up old data...');

  await prisma.inspiritTrainingAssignment.deleteMany({});
  console.log('  ✓ Deleted TrainingAssignment records');

  await prisma.inspiritCertificate.deleteMany({});
  console.log('  ✓ Deleted Certificate records');

  await prisma.inspiritTestAttempt.deleteMany({});
  console.log('  ✓ Deleted TestAttempt records');

  await prisma.inspiritQuestion.deleteMany({});
  console.log('  ✓ Deleted Question records');

  await prisma.inspiritTest.deleteMany({});
  console.log('  ✓ Deleted Test records');

  await prisma.inspiritTraining.deleteMany({});
  console.log('  ✓ Deleted Training records');

  // Delete User data first (has FK to TabCisZam)
  await prisma.$executeRaw`DELETE FROM [User]`;
  console.log('  ✓ Deleted User records');

  // Delete auth data via raw SQL (InspiritUserAuth)
  await prisma.$executeRaw`DELETE FROM [InspiritUserAuth]`;
  console.log('  ✓ Deleted InspiritUserAuth records');

  // Delete Helios data via raw SQL
  await prisma.$executeRaw`DELETE FROM [TabCisZam_EXT]`;
  console.log('  ✓ Deleted TabCisZam_EXT records');

  await prisma.$executeRaw`DELETE FROM [TabCisZam]`;
  console.log('  ✓ Deleted TabCisZam records');

  console.log('');

  // ============================================================================
  // STEP 1: Create Helios Employee Master Data (TabCisZam)
  // ============================================================================
  console.log('👥 Creating employee master data (TabCisZam)...');

  const plainPassword = 'heslo'; // Plain text password (Helios ERP constraint)

  // Insert 4 employees into TabCisZam (simulated Helios table)
  await prisma.$executeRaw`
    SET IDENTITY_INSERT [TabCisZam] ON;

    INSERT INTO [TabCisZam] (ID, Cislo, Jmeno, Prijmeni, Alias)
    VALUES
      (1, 999999, N'Admin', N'Testovací', ${plainPassword}),
      (2, 888888, N'Školitel', N'Testovací', ${plainPassword}),
      (3, 123456, N'Pracovník', N'Testovací', ${plainPassword}),
      (801, 900030, N'Ondřej', N'Chládek', '111111');

    SET IDENTITY_INSERT [TabCisZam] OFF;
  `;
  console.log('  ✓ Created 4 employees in TabCisZam');
  console.log('    - ID 1: Admin (999999)');
  console.log('    - ID 2: Školitel (888888)');
  console.log('    - ID 3: Pracovník (123456)');
  console.log('    - ID 801: Ondřej Chládek (900030)');
  console.log('');

  // ============================================================================
  // STEP 2: Add Training Columns to TabCisZam_EXT (Simulate Production)
  // ============================================================================
  console.log('📚 Adding training columns to TabCisZam_EXT (simulating production)...');

  // Add CMM training columns
  await prisma.$executeRaw`
    ALTER TABLE [TabCisZam_EXT]
    ADD _CMMDatumPosl DATE NULL,
        _CMMDatumPristi DATE NULL,
        _CMMPozadovano BIT NULL;
  `;
  console.log('  ✓ Added CMM training columns');

  // Add EDM training columns
  await prisma.$executeRaw`
    ALTER TABLE [TabCisZam_EXT]
    ADD _EDMDatumPosl DATE NULL,
        _EDMDatumPristi DATE NULL,
        _EDMPozadovano BIT NULL;
  `;
  console.log('  ✓ Added EDM training columns');

  // Add ITBezpecnost training columns
  await prisma.$executeRaw`
    ALTER TABLE [TabCisZam_EXT]
    ADD _ITBezpecnostDatumPosl DATE NULL,
        _ITBezpecnostDatumPristi DATE NULL,
        _ITBezpecnostPozadovano BIT NULL;
  `;
  console.log('  ✓ Added ITBezpecnost training columns');

  // Insert training data for all 4 employees
  await prisma.$executeRaw`
    INSERT INTO [TabCisZam_EXT] (
      ID,
      _CMMDatumPosl, _CMMDatumPristi, _CMMPozadovano,
      _EDMDatumPosl, _EDMDatumPristi, _EDMPozadovano,
      _ITBezpecnostDatumPosl, _ITBezpecnostDatumPristi, _ITBezpecnostPozadovano
    )
    VALUES
      (1, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0),
      (2, NULL, NULL, 0, NULL, NULL, 0, NULL, NULL, 0),
      (3, NULL, NULL, 1, NULL, NULL, 1, NULL, NULL, 1),
      (801, NULL, NULL, 1, NULL, NULL, 1, NULL, NULL, 1);
  `;
  console.log('  ✓ Created training data for 4 employees');
  console.log('    - Worker (ID 3): CMM, EDM, ITBezpecnost required');
  console.log('    - Ondřej (ID 801): CMM, EDM, ITBezpecnost required');
  console.log('');

  // ============================================================================
  // STEP 3: Create Auth Data via Prisma (Routes to InspiritUserAuth via trigger)
  // ============================================================================
  console.log('🔐 Creating authentication data (via User SYNONYM → InspiritUserAuth)...');

  // Admin user
  await prisma.$executeRaw`
    INSERT INTO [User] (ID, Cislo, role, email, Alias, Jmeno, Prijmeni, createdAt, updatedAt)
    VALUES (1, 999999, 'ADMIN', 'admin@admin.cz', ${plainPassword}, N'Admin', N'Testovací', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  console.log('  ✓ Admin: admin@admin.cz / heslo (cislo: 999999)');

  // Trainer user
  await prisma.$executeRaw`
    INSERT INTO [User] (ID, Cislo, role, email, Alias, Jmeno, Prijmeni, createdAt, updatedAt)
    VALUES (2, 888888, 'TRAINER', 'trainer@trainer.cz', ${plainPassword}, N'Školitel', N'Testovací', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  console.log('  ✓ Trainer: trainer@trainer.cz / heslo (cislo: 888888)');

  // Worker user
  await prisma.$executeRaw`
    INSERT INTO [User] (ID, Cislo, role, email, Alias, Jmeno, Prijmeni, createdAt, updatedAt)
    VALUES (3, 123456, 'WORKER', 'worker@dev.local', ${plainPassword}, N'Pracovník', N'Testovací', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  console.log('  ✓ Worker: cislo 123456 / heslo (dev email: worker@dev.local)');

  // Ondřej Chládek user (production data)
  await prisma.$executeRaw`
    INSERT INTO [User] (ID, Cislo, role, email, Alias, Jmeno, Prijmeni, createdAt, updatedAt)
    VALUES (801, 900030, 'WORKER', 'ondrej@dev.local', '111111', N'Ondřej', N'Chládek', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  console.log('  ✓ Ondřej Chládek: cislo 900030 / 111111 (dev email: ondrej@dev.local)');
  console.log('');

  // ============================================================================
  // STEP 4: Training Sync Will Create InspiritTraining Records
  // ============================================================================
  console.log('');
  console.log('⚠️  InspiritTraining records will be created automatically by training sync');
  console.log('');
  console.log('Workflow:');
  console.log('  1. Run `npm run dev` to start the development server');
  console.log('  2. instrumentation.ts calls initializeTrainings() on startup');
  console.log('  3. detectTrainingColumns() scans TabCisZam_EXT for training columns');
  console.log('  4. syncTrainingsWithDatabase() creates InspiritTraining records:');
  console.log('     - CMM (Školení CMM)');
  console.log('     - EDM (Školení EDM)');
  console.log('     - ITBezpecnost (Školení ITBezpecnost)');
  console.log('  5. Trainers can then add tests/questions via UI');
  console.log('');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('========================================');
  console.log('🎉 Seed completed successfully!');
  console.log('========================================');
  console.log('');
  console.log('📊 Summary:');
  console.log('  - 4 employees in TabCisZam');
  console.log('  - 3 training column sets in TabCisZam_EXT (CMM, EDM, ITBezpecnost)');
  console.log('  - 4 users with authentication (1 admin, 1 trainer, 2 workers)');
  console.log('  - Training sync will auto-create InspiritTraining records on app startup');
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('  Admin:          admin@admin.cz / heslo');
  console.log('  Trainer:        trainer@trainer.cz / heslo');
  console.log('  Worker:         123456 / heslo');
  console.log('  Ondřej Chládek: 900030 / 111111');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('  1. Run `npm run dev` to start development server');
  console.log('  2. Training sync will detect columns and create InspiritTraining records');
  console.log('  3. Login as trainer@trainer.cz to add training content, tests, and questions');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
