const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simple role assignment...\n');

  try {
    // 1. Set test@test.cz as ADMIN
    const adminUpdate = await prisma.user.update({
      where: {
        email: 'test@test.cz'
      },
      data: {
        role: 'ADMIN'
      }
    });
    console.log(`✅ Updated ${adminUpdate.name} (${adminUpdate.email}) to ADMIN`);

    // 2. Keep user with code 123456 as WORKER (already is)
    const workerUser = await prisma.user.findFirst({
      where: { code: 123456 }
    });
    if (workerUser) {
      console.log(`ℹ️  ${workerUser.name} (code 123456) remains as ${workerUser.role}`);
    }

    // 3. Get final summary
    const users = await prisma.user.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log('\n📊 FINAL USER ROLES:');
    console.log('===================');
    users.forEach(user => {
      const roleLabel = user.role === 'ADMIN' ? '👑 ADMIN' :
                        user.role === 'TRAINER' ? '👨‍🏫 TRAINER' :
                        '👷 WORKER';
      console.log(`${roleLabel} - ${user.name} (code: ${user.code || 'none'}, email: ${user.email || 'none'})`);
    });

    console.log('\n✅ Role assignment completed!');

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