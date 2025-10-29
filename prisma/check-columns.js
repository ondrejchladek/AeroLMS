const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking User table columns...\n');

  try {
    // Get all column names from User table
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'User'
        AND TABLE_SCHEMA = 'dbo'
      ORDER BY ORDINAL_POSITION
    `;

    console.log('📋 ALL COLUMNS IN USER TABLE:');
    console.log('=============================');
    columns.forEach((col) => {
      console.log(
        `${col.COLUMN_NAME.padEnd(50)} ${col.DATA_TYPE.padEnd(20)} ${col.IS_NULLABLE}`
      );
    });

    // Find training-related columns
    const trainingColumns = columns.filter(
      (col) =>
        col.COLUMN_NAME.endsWith('DatumPosl') ||
        col.COLUMN_NAME.endsWith('DatumPristi') ||
        col.COLUMN_NAME.endsWith('Pozadovano')
    );

    console.log('\n📚 TRAINING-RELATED COLUMNS:');
    console.log('============================');

    // Group by training code
    const trainings = {};
    trainingColumns.forEach((col) => {
      let code;
      let type;

      if (col.COLUMN_NAME.endsWith('DatumPosl')) {
        code = col.COLUMN_NAME.substring(0, col.COLUMN_NAME.length - 9);
        type = 'DatumPosl';
      } else if (col.COLUMN_NAME.endsWith('DatumPristi')) {
        code = col.COLUMN_NAME.substring(0, col.COLUMN_NAME.length - 11);
        type = 'DatumPristi';
      } else if (col.COLUMN_NAME.endsWith('Pozadovano')) {
        code = col.COLUMN_NAME.substring(0, col.COLUMN_NAME.length - 10);
        type = 'Pozadovano';
      }

      if (!trainings[code]) {
        trainings[code] = {
          code: code,
          hasDatumPosl: false,
          hasDatumPristi: false,
          hasPozadovano: false
        };
      }
      trainings[code][`has${type}`] = true;
    });

    // Display training detection
    console.log('\nDETECTED TRAININGS:');
    console.log('Code'.padEnd(40) + 'DatumPosl  DatumPristi  Pozadovano');
    console.log('='.repeat(70));

    Object.values(trainings).forEach((t) => {
      console.log(
        t.code.padEnd(40) +
          (t.hasDatumPosl ? '✓' : '✗').padEnd(11) +
          (t.hasDatumPristi ? '✓' : '✗').padEnd(13) +
          (t.hasPozadovano ? '✓' : '✗')
      );
    });

    // Check actual values for users
    console.log('\n📊 TRAINING VALUES IN DATABASE:');
    console.log('================================');

    const users = await prisma.user.findMany();

    for (const user of users) {
      console.log(`\n👤 ${user.name} (${user.code || 'no code'}):`);

      for (const training of Object.values(trainings)) {
        const pozadovano = user[`${training.code}Pozadovano`];
        const datumPosl = user[`${training.code}DatumPosl`];
        const datumPristi = user[`${training.code}DatumPristi`];

        if (pozadovano !== null || datumPosl !== null || datumPristi !== null) {
          console.log(`  ${training.code}:`);
          console.log(`    Požadováno: ${pozadovano}`);
          console.log(
            `    Datum posl: ${datumPosl ? new Date(datumPosl).toLocaleDateString('cs-CZ') : 'null'}`
          );
          console.log(
            `    Datum příští: ${datumPristi ? new Date(datumPristi).toLocaleDateString('cs-CZ') : 'null'}`
          );
        }
      }
    }

    // Recommendations
    console.log('\n💡 FINDINGS:');
    console.log('===========');

    const trainingsWithPozadovano = Object.values(trainings).filter(
      (t) => t.hasPozadovano
    );
    console.log(
      `✅ Found ${trainingsWithPozadovano.length} trainings with Pozadovano column`
    );

    const trainingsWithAllColumns = Object.values(trainings).filter(
      (t) => t.hasDatumPosl && t.hasDatumPristi && t.hasPozadovano
    );
    console.log(
      `✅ Found ${trainingsWithAllColumns.length} trainings with all 3 columns`
    );

    console.log(
      '\n⚠️  Current sync logic requires all 3 columns, should be based on Pozadovano!'
    );
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Check failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
