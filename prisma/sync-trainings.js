const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function detectTrainingColumns() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'User'
        AND TABLE_SCHEMA = 'dbo'
      ORDER BY ORDINAL_POSITION
    `;

    const trainings = new Map();

    for (const row of columns) {
      const column = row.COLUMN_NAME;

      // Check for DatumPosl pattern
      if (column.endsWith('DatumPosl')) {
        const code = column.substring(0, column.length - 9);
        if (!trainings.has(code)) {
          trainings.set(code, {
            code,
            hasDatumPosl: true,
            hasDatumPristi: false,
            hasPozadovano: false
          });
        } else {
          trainings.get(code).hasDatumPosl = true;
        }
      }
      // Check for DatumPristi pattern
      else if (column.endsWith('DatumPristi')) {
        const code = column.substring(0, column.length - 11);
        if (!trainings.has(code)) {
          trainings.set(code, {
            code,
            hasDatumPosl: false,
            hasDatumPristi: true,
            hasPozadovano: false
          });
        } else {
          trainings.get(code).hasDatumPristi = true;
        }
      }
      // Check for Pozadovano pattern
      else if (column.endsWith('Pozadovano')) {
        const code = column.substring(0, column.length - 10);
        if (!trainings.has(code)) {
          trainings.set(code, {
            code,
            hasDatumPosl: false,
            hasDatumPristi: false,
            hasPozadovano: true
          });
        } else {
          trainings.get(code).hasPozadovano = true;
        }
      }
    }

    // Return only trainings with Pozadovano column (as requested by user)
    const trainingsWithPozadovano = Array.from(trainings.values()).filter(
      (t) => t.hasPozadovano
    );

    return trainingsWithPozadovano;
  } catch (error) {
    console.error('Error detecting training columns:', error);
    return [];
  }
}

async function main() {
  console.log('🔄 Starting training synchronization...\n');

  try {
    // 1. Detect all training columns
    const detectedTrainings = await detectTrainingColumns();
    console.log(
      `📊 Detected ${detectedTrainings.length} trainings from User table columns`
    );

    // Show detected trainings
    console.log('\n📋 DETECTED TRAININGS:');
    console.log('====================');
    detectedTrainings.forEach((t, idx) => {
      const flags = [
        t.hasDatumPosl ? '✓ DatumPosl' : '✗ DatumPosl',
        t.hasDatumPristi ? '✓ DatumPristi' : '✗ DatumPristi',
        t.hasPozadovano ? '✓ Pozadovano' : '✗ Pozadovano'
      ];
      console.log(
        `${(idx + 1).toString().padStart(2)}. ${t.code.padEnd(40)} [${flags.join(', ')}]`
      );
    });

    // 2. Check existing trainings in database
    const existingTrainings = await prisma.training.findMany({
      select: {
        id: true,
        code: true,
        name: true
      }
    });

    const existingCodes = new Set(existingTrainings.map((t) => t.code));

    console.log(
      `\n📚 Found ${existingTrainings.length} existing trainings in database:`
    );
    existingTrainings.forEach((t) => {
      console.log(`  - ${t.code}: ${t.name || '(no name)'}`);
    });

    // 3. Find missing trainings
    const missingCodes = detectedTrainings
      .filter((t) => !existingCodes.has(t.code))
      .map((t) => t.code);

    if (missingCodes.length === 0) {
      console.log('\n✅ All detected trainings already exist in database!');
      return;
    }

    console.log(
      `\n⚠️  Found ${missingCodes.length} missing trainings to create`
    );

    // 4. Create missing trainings
    console.log('\n🚀 Creating missing trainings...');
    console.log('================================');

    let created = 0;
    let errors = 0;

    for (const code of missingCodes) {
      try {
        const training = await prisma.training.create({
          data: {
            code: code,
            name: code, // Use code as name (as user requested)
            description: `Školení ${code}`
          }
        });
        created++;
        console.log(`✅ Created: ${code} (ID: ${training.id})`);
      } catch (error) {
        errors++;
        console.error(`❌ Failed to create ${code}:`, error.message);
      }
    }

    // 5. Final summary
    console.log('\n📊 SYNCHRONIZATION SUMMARY:');
    console.log('==========================');
    console.log(`Total detected trainings: ${detectedTrainings.length}`);
    console.log(`Previously existing: ${existingTrainings.length}`);
    console.log(`Newly created: ${created}`);
    console.log(`Errors: ${errors}`);

    // 6. Verify final state
    const finalCount = await prisma.training.count();
    console.log(`\n✅ Total trainings in database now: ${finalCount}`);

    // 7. Show all trainings with Pozadovano status for users
    console.log('\n📋 TRAINING STATUS FOR USERS:');
    console.log('============================');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    for (const user of users) {
      console.log(`\n👤 ${user.name} (code: ${user.code || 'none'}):`);

      let requiredCount = 0;
      for (const training of detectedTrainings) {
        const columnPozadovano = `${training.code}Pozadovano`;

        const result = await prisma.$queryRawUnsafe(`
          SELECT [${columnPozadovano}] as pozadovano
          FROM [User]
          WHERE UserID = ${user.id}
        `);

        if (result[0]?.pozadovano) {
          requiredCount++;
          console.log(`  ✅ ${training.code} - Required`);
        }
      }
      console.log(`  Total required trainings: ${requiredCount}`);
    }
  } catch (error) {
    console.error('❌ Synchronization failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
