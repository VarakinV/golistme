const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();
const ROLES = ['USER', 'ADMIN', 'SUPERADMIN'];

async function main() {
  const [emailArg, role] = process.argv.slice(2);

  if (!emailArg || !role || !ROLES.includes(role)) {
    console.error('Usage: node scripts/set-platform-role.js <email> <USER|ADMIN|SUPERADMIN>');
    console.error('The account must already exist. Create it through the website first.');
    process.exitCode = 1;
    return;
  }

  const email = emailArg.trim().toLowerCase();

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { platformRole: role },
      select: { id: true, email: true, platformRole: true },
    });

    console.log(`Updated ${user.email} to ${user.platformRole}.`);
  } catch (e) {
    if (e.code === 'P2025') {
      console.error(`No account exists for ${email}.`);
      console.error('Create the account through the website first, then run this script again.');
      process.exitCode = 1;
      return;
    }
    throw e;
  }
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
