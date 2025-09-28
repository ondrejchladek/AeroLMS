const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting smart role assignment...\n');

  try {
    // 1. First, check if any users need a role
    const usersNeedingRole = await prisma.user.count({
      where: {
        OR: [
          { role: null },
          { role: '' }
        ]
      }
    });

    if (usersNeedingRole > 0) {
      const updated = await prisma.user.updateMany({
        where: {
          OR: [
            { role: null },
            { role: '' }
          ]
        },
        data: {
          role: 'WORKER'
        }
      });
      console.log(`✅ Set ${updated.count} users without role to WORKER (default)`);
    } else {
      console.log('ℹ️  All users already have roles assigned');
    }

    // 2. Check if we have any ADMINs
    const existingAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    if (existingAdmins.length === 0) {
      console.log('⚠️  No ADMINs found. Setting up admin users...');

      // Priority 1: test@test.cz
      const testAdmin = await prisma.user.updateMany({
        where: { email: 'test@test.cz' },
        data: { role: 'ADMIN' }
      });

      if (testAdmin.count > 0) {
        console.log('✅ Updated test@test.cz to ADMIN');
      } else {
        // Priority 2: User with code 1001 or lowest code
        const firstUser = await prisma.user.findFirst({
          where: {
            NOT: { code: null }
          },
          orderBy: { code: 'asc' }
        });

        if (firstUser) {
          await prisma.user.update({
            where: { id: firstUser.id },
            data: { role: 'ADMIN' }
          });
          console.log(`✅ Set ${firstUser.name} (code: ${firstUser.code}) as ADMIN`);
        } else {
          // Priority 3: First user by ID
          const veryFirstUser = await prisma.user.findFirst({
            orderBy: { id: 'asc' }
          });

          if (veryFirstUser) {
            await prisma.user.update({
              where: { id: veryFirstUser.id },
              data: { role: 'ADMIN' }
            });
            console.log(`✅ Set ${veryFirstUser.name} as ADMIN (first user by ID)`);
          }
        }
      }
    } else {
      console.log(`✅ Found ${existingAdmins.length} existing ADMIN(s)`);
    }

    // 3. Check if we have any TRAINERs
    const existingTrainers = await prisma.user.findMany({
      where: { role: 'TRAINER' }
    });

    if (existingTrainers.length === 0) {
      console.log('⚠️  No TRAINERs found. Setting up trainer users...');

      // Look for users with codes in 2000-2999 range (common trainer range)
      const potentialTrainers = await prisma.user.findMany({
        where: {
          code: {
            gte: 2000,
            lt: 3000
          },
          role: 'WORKER' // Don't change ADMINs
        },
        take: 2 // Create at most 2 trainers
      });

      if (potentialTrainers.length > 0) {
        for (const trainer of potentialTrainers) {
          await prisma.user.update({
            where: { id: trainer.id },
            data: { role: 'TRAINER' }
          });
          console.log(`✅ Set ${trainer.name} (code: ${trainer.code}) as TRAINER`);
        }
      } else {
        // Alternative: Pick 1-2 users with email addresses (more likely to be staff)
        const usersWithEmail = await prisma.user.findMany({
          where: {
            NOT: [
              { email: null },
              { email: '' },
              { role: 'ADMIN' }
            ],
            role: 'WORKER'
          },
          take: 2
        });

        for (const user of usersWithEmail) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'TRAINER' }
          });
          console.log(`✅ Set ${user.name} (${user.email}) as TRAINER`);
        }
      }
    } else {
      console.log(`✅ Found ${existingTrainers.length} existing TRAINER(s)`);
    }

    // 4. Handle special case: User with code 123456
    const user123456 = await prisma.user.findFirst({
      where: { code: 123456 }
    });

    if (user123456) {
      // Keep this user as WORKER unless already changed
      if (user123456.role !== 'WORKER' && user123456.role !== 'ADMIN' && user123456.role !== 'TRAINER') {
        await prisma.user.update({
          where: { id: user123456.id },
          data: { role: 'WORKER' }
        });
        console.log(`✅ User with code 123456 (${user123456.name}) set as WORKER`);
      } else {
        console.log(`ℹ️  User with code 123456 already has role: ${user123456.role}`);
      }
    }

    // 5. Create training assignments for trainers (if needed)
    const trainers = await prisma.user.findMany({
      where: { role: 'TRAINER' }
    });

    const trainings = await prisma.training.findMany();

    if (trainers.length > 0 && trainings.length > 0) {
      console.log('\n📋 Setting up training assignments...');

      // Check if we already have assignments
      const existingAssignments = await prisma.trainingAssignment.count();

      if (existingAssignments === 0) {
        // Distribute trainings among trainers
        const trainingsPerTrainer = Math.ceil(trainings.length / trainers.length);

        for (let i = 0; i < trainers.length; i++) {
          const trainer = trainers[i];
          const startIdx = i * trainingsPerTrainer;
          const endIdx = Math.min(startIdx + trainingsPerTrainer, trainings.length);

          for (let j = startIdx; j < endIdx; j++) {
            await prisma.trainingAssignment.create({
              data: {
                trainerId: trainer.id,
                trainingId: trainings[j].id
              }
            });
            console.log(`  ✅ Assigned "${trainings[j].name || trainings[j].code}" to ${trainer.name}`);
          }
        }
      } else {
        console.log(`  ℹ️  Found ${existingAssignments} existing assignments`);
      }
    }

    // 6. Final summary
    console.log('\n📊 FINAL ROLE DISTRIBUTION:');
    console.log('==========================');

    const finalRoles = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    let totalUsers = 0;
    finalRoles.forEach(r => {
      console.log(`${(r.role || 'NULL').padEnd(10)}: ${r._count} users`);
      totalUsers += r._count;
    });
    console.log(`${'TOTAL'.padEnd(10)}: ${totalUsers} users`);

    // List all admins and trainers
    const finalAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { name: true, code: true, email: true }
    });

    const finalTrainers = await prisma.user.findMany({
      where: { role: 'TRAINER' },
      select: { name: true, code: true, email: true }
    });

    console.log('\n👑 ADMINs:');
    finalAdmins.forEach(a => {
      console.log(`  - ${a.name} (code: ${a.code || 'none'}, email: ${a.email || 'none'})`);
    });

    console.log('\n👨‍🏫 TRAINERs:');
    finalTrainers.forEach(t => {
      console.log(`  - ${t.name} (code: ${t.code || 'none'}, email: ${t.email || 'none'})`);
    });

    console.log('\n✅ Smart role assignment completed!');

  } catch (error) {
    console.error('❌ Error during role assignment:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Role assignment failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });