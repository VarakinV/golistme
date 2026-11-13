const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.realtorWorkspace.findMany({
    where: {
      OR: [{ firstName: null }, { firstName: '' }],
    },
    select: { id: true, name: true, firstName: true, lastName: true },
  });

  let updated = 0;
  for (const row of rows) {
    const parts = (row.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = row.firstName || parts[0] || 'Realtor';
    const lastName = row.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : '');
    if (firstName === row.firstName && lastName === row.lastName) continue;

    await prisma.realtorWorkspace.update({
      where: { id: row.id },
      data: { firstName, lastName },
    });
    updated += 1;
    console.log(`Updated ${row.id}: ${firstName} ${lastName}`);
  }

  console.log(`Backfilled ${updated} workspace(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
