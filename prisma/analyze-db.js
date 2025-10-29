const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Analyzing database...\n');

  try {
    // 1. Get all users with their current data
    const users = await prisma.user.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: [{ role: 'asc' }, { code: 'asc' }]
    });

    console.log('👥 USERS IN DATABASE:');
    console.log('=====================');
    users.forEach((user) => {
      console.log(
        `ID: ${user.id} | Code: ${user.code || 'NULL'} | Name: ${user.name} | Email: ${user.email || 'NULL'} | Role: ${user.role || 'NULL'}`
      );
    });

    // 2. Get role distribution
    const roleCount = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    console.log('\n📊 ROLE DISTRIBUTION:');
    console.log('===================');
    roleCount.forEach((r) => {
      console.log(`${r.role || 'NULL/EMPTY'}: ${r._count} users`);
    });

    // 3. Special users check
    console.log('\n🔑 SPECIAL USERS:');
    console.log('================');

    const testUser = await prisma.user.findFirst({
      where: { email: 'test@test.cz' }
    });
    if (testUser) {
      console.log(
        `✓ test@test.cz exists - ID: ${testUser.id}, Code: ${testUser.code || 'NULL'}, Role: ${testUser.role || 'NULL'}`
      );
    } else {
      console.log('✗ test@test.cz not found');
    }

    const code123456 = await prisma.user.findFirst({
      where: { code: 123456 }
    });
    if (code123456) {
      console.log(
        `✓ User with code 123456 exists - Name: ${code123456.name}, Role: ${code123456.role || 'NULL'}`
      );
    } else {
      console.log('✗ No user with code 123456');
    }

    // 4. Check for existing admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });
    console.log(`\n👑 Current ADMINs: ${admins.length}`);
    admins.forEach((admin) => {
      console.log(
        `  - ${admin.name} (Code: ${admin.code || 'NULL'}, Email: ${admin.email || 'NULL'})`
      );
    });

    // 5. Check for existing trainers
    const trainers = await prisma.user.findMany({
      where: { role: 'TRAINER' }
    });
    console.log(`\n👨‍🏫 Current TRAINERs: ${trainers.length}`);
    trainers.forEach((trainer) => {
      console.log(
        `  - ${trainer.name} (Code: ${trainer.code || 'NULL'}, Email: ${trainer.email || 'NULL'})`
      );
    });

    // 6. Get trainings
    const trainings = await prisma.training.findMany({
      select: {
        id: true,
        code: true,
        name: true
      }
    });
    console.log(`\n📚 TRAININGS: ${trainings.length}`);
    trainings.forEach((t) => {
      console.log(`  - ${t.code}: ${t.name || '(no name)'}`);
    });

    // 7. Get training assignments
    const assignments = await prisma.trainingAssignment.findMany({
      include: {
        trainer: {
          select: {
            name: true,
            code: true
          }
        },
        training: {
          select: {
            code: true,
            name: true
          }
        }
      }
    });
    console.log(`\n📋 TRAINING ASSIGNMENTS: ${assignments.length}`);
    assignments.forEach((a) => {
      console.log(
        `  - Trainer: ${a.trainer.name} (${a.trainer.code || 'no code'}) -> Training: ${a.training.name || a.training.code}`
      );
    });

    // 8. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('==================');

    if (admins.length === 0) {
      console.log(
        '⚠️  No ADMIN users found. Consider assigning ADMIN role to a user.'
      );
      if (testUser) {
        console.log('    Suggestion: Update test@test.cz to ADMIN');
      }
    }

    if (trainers.length === 0) {
      console.log(
        '⚠️  No TRAINER users found. Consider assigning TRAINER role to some users.'
      );
    }

    const usersWithoutRole = users.filter((u) => !u.role || u.role === '');
    if (usersWithoutRole.length > 0) {
      console.log(
        `ℹ️  ${usersWithoutRole.length} users without role (will default to WORKER)`
      );
    }

    console.log('\n✅ Analysis complete!');
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Analysis failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
