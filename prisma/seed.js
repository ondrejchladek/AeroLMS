/**
 * Prisma seed file
 * Seeds the database with initial development data
 *
 * Architecture:
 * 1. Insert into TabCisZam (Helios employee master - direct SQL)
 * 2. Insert into TabCisZam_EXT (Helios training columns - direct SQL)
 * 3. Upsert User via Prisma (INSTEAD OF trigger routes to InspiritUserAuth)
 * 4. Create Trainings, Tests, Questions, Assignments
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

  await prisma.trainingAssignment.deleteMany({});
  console.log('  ✓ Deleted TrainingAssignment records');

  await prisma.certificate.deleteMany({});
  console.log('  ✓ Deleted Certificate records');

  await prisma.testAttempt.deleteMany({});
  console.log('  ✓ Deleted TestAttempt records');

  await prisma.question.deleteMany({});
  console.log('  ✓ Deleted Question records');

  await prisma.test.deleteMany({});
  console.log('  ✓ Deleted Test records');

  await prisma.training.deleteMany({});
  console.log('  ✓ Deleted Training records');

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

  // Insert 3 employees into TabCisZam (simulated Helios table)
  await prisma.$executeRaw`
    SET IDENTITY_INSERT [TabCisZam] ON;

    INSERT INTO [TabCisZam] (ID, Cislo, Jmeno, Prijmeni, Alias)
    VALUES
      (1, 999999, N'Admin', N'Testovací', ${plainPassword}),
      (2, 888888, N'Školitel', N'Testovací', ${plainPassword}),
      (3, 123456, N'Pracovník', N'Testovací', ${plainPassword});

    SET IDENTITY_INSERT [TabCisZam] OFF;
  `;
  console.log('  ✓ Created 3 employees in TabCisZam');
  console.log('    - ID 1: Admin (999999)');
  console.log('    - ID 2: Školitel (888888)');
  console.log('    - ID 3: Pracovník (123456)');
  console.log('');

  // ============================================================================
  // STEP 2: Create Training Columns Data (TabCisZam_EXT)
  // ============================================================================
  console.log('📚 Creating training columns data (TabCisZam_EXT)...');

  // Insert training data for all 3 employees
  await prisma.$executeRaw`
    INSERT INTO [TabCisZam_EXT] (ID, _CMMDatumPosl, _CMMDatumPristi, _CMMPozadovano, _EDMDatumPosl, _EDMDatumPristi, _EDMPozadovano)
    VALUES
      (1, NULL, NULL, 0, NULL, NULL, 0),
      (2, NULL, NULL, 0, NULL, NULL, 0),
      (3, NULL, NULL, 1, NULL, NULL, 1);
  `;
  console.log('  ✓ Created training columns for 3 employees');
  console.log('    - Worker (ID 3) requires CMM and EDM trainings');
  console.log('');

  // ============================================================================
  // STEP 3: Create Auth Data via Prisma (Routes to InspiritUserAuth via trigger)
  // ============================================================================
  console.log('🔐 Creating authentication data (via User SYNONYM → InspiritUserAuth)...');

  // Admin user
  const admin = await prisma.$executeRaw`
    INSERT INTO [User] (UserID, Cislo, role, email, Alias, Jmeno, Prijmeni)
    VALUES (1, 999999, 'ADMIN', 'admin@admin.cz', ${plainPassword}, N'Admin', N'Testovací')
  `;
  console.log('  ✓ Admin: admin@admin.cz / heslo (cislo: 999999)');

  // Trainer user
  const trainer = await prisma.$executeRaw`
    INSERT INTO [User] (UserID, Cislo, role, email, Alias, Jmeno, Prijmeni)
    VALUES (2, 888888, 'TRAINER', 'trainer@trainer.cz', ${plainPassword}, N'Školitel', N'Testovací')
  `;
  console.log('  ✓ Trainer: trainer@trainer.cz / heslo (cislo: 888888)');

  // Worker user
  const worker = await prisma.$executeRaw`
    INSERT INTO [User] (UserID, Cislo, role, email, Alias, Jmeno, Prijmeni)
    VALUES (3, 123456, 'WORKER', NULL, ${plainPassword}, N'Pracovník', N'Testovací')
  `;
  console.log('  ✓ Worker: cislo 123456 / heslo (no email)');
  console.log('');

  // ============================================================================
  // STEP 4: Create Training Modules
  // ============================================================================
  console.log('📖 Creating training modules...');

  const cmmTraining = await prisma.training.create({
    data: {
      code: 'CMM',
      name: 'CMM - Koordinátové měřící stroje',
      description: 'Školení pro obsluhu koordinátových měřících strojů',
      content: JSON.stringify({
        introduction: 'Koordinátové měřící stroje (CMM) jsou klíčové pro kontrolu kvality vyráběných dílů.',
        keyPoints: [
          'Bezpečnost práce s CMM',
          'Kalibrace a nastavení',
          'Měření a vyhodnocení výsledků',
          'Údržba a čištění'
        ],
        rules: [
          'Před použitím zkontrolovat kalibraci',
          'Nepoužívat poškozené nástroje',
          'Udržovat měřící hlavy v čistotě'
        ],
        ppe: [
          'Ochranné brýle',
          'Pracovní oděv'
        ]
      })
    }
  });
  console.log('  ✓ Created: CMM - Koordinátové měřící stroje');

  const edmTraining = await prisma.training.create({
    data: {
      code: 'EDM',
      name: 'EDM - Elektro-erozivní obrábění',
      description: 'Školení pro práci s EDM stroji',
      content: JSON.stringify({
        introduction: 'EDM je technologie přesného obrábění pomocí elektrických výbojů.',
        keyPoints: [
          'Princip elektro-erozivního obrábění',
          'Bezpečnostní opatření',
          'Nastavení parametrů obrábění',
          'Kontrola kvality výsledků'
        ],
        hazards: [
          'Elektrické napětí',
          'Výpary z procesu obrábění',
          'Požární riziko'
        ]
      })
    }
  });
  console.log('  ✓ Created: EDM - Elektro-erozivní obrábění');

  const itTraining = await prisma.training.create({
    data: {
      code: 'ITBezpecnost',
      name: 'IT Bezpečnost',
      description: 'Školení o kybernetické bezpečnosti a ochraně dat',
      content: JSON.stringify({
        introduction: 'Kybernetická bezpečnost je klíčová pro ochranu firemních dat.',
        keyPoints: [
          'Silná hesla a vícefaktorová autentizace',
          'Rozpoznání phishingových útoků',
          'Bezpečné používání e-mailu',
          'GDPR a ochrana osobních údajů'
        ],
        rules: [
          'Nikdy nesdílet hesla',
          'Pravidelně aktualizovat software',
          'Neotevírat podezřelé přílohy'
        ]
      })
    }
  });
  console.log('  ✓ Created: ITBezpecnost - IT Bezpečnost');
  console.log('');

  // ============================================================================
  // STEP 5: Create Tests for Trainings
  // ============================================================================
  console.log('📝 Creating tests...');

  const cmmTest = await prisma.test.create({
    data: {
      trainingId: cmmTraining.id,
      title: 'CMM - Závěrečný test',
      description: 'Test znalostí z oblasti CMM měření',
      isActive: true,
      passingScore: 75,
      timeLimit: 15
    }
  });
  console.log('  ✓ Created test for CMM training');

  const edmTest = await prisma.test.create({
    data: {
      trainingId: edmTraining.id,
      title: 'EDM - Závěrečný test',
      description: 'Test znalostí z oblasti EDM obrábění',
      isActive: true,
      passingScore: 75,
      timeLimit: 15
    }
  });
  console.log('  ✓ Created test for EDM training');

  const itTest = await prisma.test.create({
    data: {
      trainingId: itTraining.id,
      title: 'IT Bezpečnost - Závěrečný test',
      description: 'Test znalostí z oblasti kybernetické bezpečnosti',
      isActive: true,
      passingScore: 80,
      timeLimit: 20
    }
  });
  console.log('  ✓ Created test for IT Bezpečnost training');
  console.log('');

  // ============================================================================
  // STEP 6: Create Questions for Tests
  // ============================================================================
  console.log('❓ Creating questions...');

  // CMM Test Questions
  await prisma.question.createMany({
    data: [
      {
        testId: cmmTest.id,
        order: 1,
        type: 'single',
        question: 'Co je CMM?',
        options: JSON.stringify([
          'Koordinátový měřící stroj',
          'Počítačový modul',
          'Chemická látka'
        ]),
        correctAnswer: JSON.stringify(['Koordinátový měřící stroj']),
        points: 10
      },
      {
        testId: cmmTest.id,
        order: 2,
        type: 'multiple',
        question: 'Jaké jsou bezpečnostní zásady při práci s CMM? (vyberte všechny správné)',
        options: JSON.stringify([
          'Zkontrolovat kalibraci před použitím',
          'Udržovat měřící hlavy v čistotě',
          'Používat poškozené nástroje',
          'Nosit ochranné brýle'
        ]),
        correctAnswer: JSON.stringify([
          'Zkontrolovat kalibraci před použitím',
          'Udržovat měřící hlavy v čistotě',
          'Nosit ochranné brýle'
        ]),
        points: 15
      },
      {
        testId: cmmTest.id,
        order: 3,
        type: 'yesno',
        question: 'Je nutné udržovat CMM stroj v čistotě?',
        options: JSON.stringify(['Ano', 'Ne']),
        correctAnswer: JSON.stringify(['Ano']),
        points: 5
      }
    ]
  });
  console.log('  ✓ Created 3 questions for CMM test');

  // EDM Test Questions
  await prisma.question.createMany({
    data: [
      {
        testId: edmTest.id,
        order: 1,
        type: 'single',
        question: 'Jaká je základní bezpečnostní zásada při práci s EDM?',
        options: JSON.stringify([
          'Dbát na elektrické napětí',
          'Pracovat bez ochrany',
          'Ignorovat výpary'
        ]),
        correctAnswer: JSON.stringify(['Dbát na elektrické napětí']),
        points: 10
      },
      {
        testId: edmTest.id,
        order: 2,
        type: 'multiple',
        question: 'Jaká rizika představuje EDM proces?',
        options: JSON.stringify([
          'Elektrické napětí',
          'Výpary z procesu',
          'Požární riziko',
          'Žádná rizika'
        ]),
        correctAnswer: JSON.stringify([
          'Elektrické napětí',
          'Výpary z procesu',
          'Požární riziko'
        ]),
        points: 15
      }
    ]
  });
  console.log('  ✓ Created 2 questions for EDM test');

  // IT Security Test Questions
  await prisma.question.createMany({
    data: [
      {
        testId: itTest.id,
        order: 1,
        type: 'single',
        question: 'Co je phishing?',
        options: JSON.stringify([
          'Podvodný pokus získat citlivé informace',
          'Druh počítačového viru',
          'Typ hardwaru'
        ]),
        correctAnswer: JSON.stringify(['Podvodný pokus získat citlivé informace']),
        points: 10
      },
      {
        testId: itTest.id,
        order: 2,
        type: 'yesno',
        question: 'Je bezpečné sdílet hesla s kolegy?',
        options: JSON.stringify(['Ano', 'Ne']),
        correctAnswer: JSON.stringify(['Ne']),
        points: 10
      },
      {
        testId: itTest.id,
        order: 3,
        type: 'multiple',
        question: 'Co patří mezi dobré bezpečnostní praktiky?',
        options: JSON.stringify([
          'Používat silná hesla',
          'Pravidelně aktualizovat software',
          'Otevírat všechny přílohy',
          'Používat vícefaktorovou autentizaci'
        ]),
        correctAnswer: JSON.stringify([
          'Používat silná hesla',
          'Pravidelně aktualizovat software',
          'Používat vícefaktorovou autentizaci'
        ]),
        points: 15
      }
    ]
  });
  console.log('  ✓ Created 3 questions for IT Bezpečnost test');
  console.log('');

  // ============================================================================
  // STEP 7: Assign Trainer to Trainings
  // ============================================================================
  console.log('👨‍🏫 Creating training assignments...');

  await prisma.trainingAssignment.createMany({
    data: [
      {
        trainerId: 2, // Trainer user ID
        trainingId: cmmTraining.id
      },
      {
        trainerId: 2,
        trainingId: edmTraining.id
      },
      {
        trainerId: 2,
        trainingId: itTraining.id
      }
    ]
  });
  console.log('  ✓ Assigned trainer to 3 trainings');
  console.log('');

  // ============================================================================
  // STEP 8: Create Sample Test Attempt (Optional)
  // ============================================================================
  console.log('📊 Creating sample test attempt...');

  const testAttempt = await prisma.testAttempt.create({
    data: {
      testId: itTest.id,
      userId: 3, // Worker user
      startedAt: new Date(),
      completedAt: new Date(),
      score: 85,
      passed: true,
      answers: JSON.stringify({
        '1': 'Podvodný pokus získat citlivé informace',
        '2': 'Ne',
        '3': ['Používat silná hesla', 'Pravidelně aktualizovat software', 'Používat vícefaktorovou autentizaci']
      })
    }
  });
  console.log('  ✓ Created sample test attempt (IT Bezpečnost - 85% passed)');
  console.log('');

  // ============================================================================
  // STEP 9: Update Training Dates in TabCisZam_EXT (Optional)
  // ============================================================================
  console.log('📅 Updating training completion dates...');

  // Mark IT Bezpečnost as completed for worker
  await prisma.$executeRaw`
    UPDATE [TabCisZam_EXT]
    SET
      _ITBezpecnostDatumPosl = GETDATE(),
      _ITBezpecnostDatumPristi = DATEADD(YEAR, 1, GETDATE())
    WHERE ID = 3
  `;
  console.log('  ✓ Updated IT Bezpečnost completion for worker (valid for 1 year)');
  console.log('');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('========================================');
  console.log('🎉 Seed completed successfully!');
  console.log('========================================');
  console.log('');
  console.log('📊 Summary:');
  console.log('  - 3 users (1 admin, 1 trainer, 1 worker)');
  console.log('  - 3 trainings (CMM, EDM, IT Bezpečnost)');
  console.log('  - 3 tests with 8 questions total');
  console.log('  - 3 training assignments');
  console.log('  - 1 sample test attempt');
  console.log('');
  console.log('🔐 Login credentials:');
  console.log('  Admin:   admin@admin.cz / heslo');
  console.log('  Trainer: trainer@trainer.cz / heslo');
  console.log('  Worker:  123456 / heslo');
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
