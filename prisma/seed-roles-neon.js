/**
 * Seed Roles for Neon Production Database
 *
 * This script assigns initial roles to users in the Neon database.
 * It should be run after the migration to set up admin and other roles.
 *
 * Usage:
 *   export DATABASE_URL=$DATABASE_URL_NEON
 *   node prisma/seed-roles-neon.js
 */

const { PrismaClient } = require('@prisma/client');

// Use Neon database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_NEON || process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('🌱 Starting role assignment for Neon database...\n');
  console.log(`📊 Using database: ${process.env.DATABASE_URL_NEON ? 'Neon' : 'Local'}\n`);

  try {
    // 1. Set test@test.cz as ADMIN (if exists)
    try {
      const adminUpdate = await prisma.user.update({
        where: {
          email: 'test@test.cz'
        },
        data: {
          role: 'ADMIN'
        }
      });
      console.log(`✅ Updated ${adminUpdate.name} (${adminUpdate.email}) to ADMIN`);
    } catch (e) {
      console.log(`⚠️ User test@test.cz not found or already updated`);
    }

    // 2. Check user with code 123456 (example worker)
    const workerUser = await prisma.user.findFirst({
      where: { code: 123456 }
    });
    if (workerUser) {
      console.log(`ℹ️  ${workerUser.name} (code 123456) is ${workerUser.role || 'WORKER'}`);
    } else {
      console.log('ℹ️  User with code 123456 not found');
    }

    // 3. Optional: Set specific trainers (adjust codes as needed)
    // Example: Set users with codes 100, 200 as trainers
    const trainerCodes = []; // Add trainer codes here if needed: [100, 200]

    if (trainerCodes.length > 0) {
      const trainerUpdates = await prisma.user.updateMany({
        where: {
          code: {
            in: trainerCodes
          }
        },
        data: {
          role: 'TRAINER'
        }
      });
      console.log(`✅ Updated ${trainerUpdates.count} users to TRAINER role`);
    }

    // 4. Ensure all users have a role (set default WORKER if null)
    const usersWithoutRole = await prisma.user.updateMany({
      where: {
        role: null
      },
      data: {
        role: 'WORKER'
      }
    });
    if (usersWithoutRole.count > 0) {
      console.log(`✅ Set ${usersWithoutRole.count} users to default WORKER role`);
    }

    // 5. Get final summary
    const rolesSummary = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    console.log('\n📊 ROLE DISTRIBUTION:');
    console.log('====================');
    rolesSummary.forEach(group => {
      const roleLabel = group.role === 'ADMIN' ? '👑 ADMIN  ' :
                        group.role === 'TRAINER' ? '👨‍🏫 TRAINER' :
                        '👷 WORKER ';
      console.log(`${roleLabel}: ${group._count.role} users`);
    });

    // 6. Show admins for reference
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        name: true,
        email: true,
        code: true
      }
    });

    console.log('\n👑 ADMIN USERS:');
    console.log('===============');
    admins.forEach(admin => {
      console.log(`- ${admin.name} (email: ${admin.email || 'none'}, code: ${admin.code || 'none'})`);
    });

    console.log('\n✅ Role assignment completed successfully!');

  } catch (error) {
    console.error('❌ Error during role assignment:', error);
    throw error;
  }
}

// Run the script
main()
  .catch((e) => {
    console.error('❌ Role assignment failed:', e);
    console.error('\nMake sure:');
    console.error('1. DATABASE_URL_NEON is set correctly');
    console.error('2. The migration has been applied');
    console.error('3. The User table has the role column');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });