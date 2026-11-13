const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  'MANAGE_LISTINGS',
  'GENERATE_MARKETING',
  'VIEW_LEADS',
  'VIEW_ANALYTICS',
  'PURCHASE_CREDITS',
];

function slugify(input) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'workspace'
  );
}

async function uniqueSlug(tx, base) {
  const root = slugify(base);
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? root : `${root}-${crypto.randomBytes(2).toString('hex')}`;
    const exists = await tx.realtorWorkspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${root}-${crypto.randomBytes(4).toString('hex')}`;
}

async function ensureWorkspace(user) {
  const membership = await prisma.workspaceMembership.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
    select: { workspaceId: true },
  });
  if (membership) return membership.workspaceId;

  return prisma.$transaction(async (tx) => {
    const slug = await uniqueSlug(tx, user.name || user.email.split('@')[0]);
    const workspace = await tx.realtorWorkspace.create({
      data: {
        slug,
        name: user.name || 'Test workspace',
        ownerUserId: user.id,
        email: user.email,
        firstName: (user.name || 'Test').split(' ')[0],
        lastName: (user.name || 'User').split(' ').slice(1).join(' ') || 'User',
      },
    });
    await tx.workspaceMembership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'OWNER',
        permissions: ALL_PERMISSIONS,
        status: 'ACTIVE',
      },
    });
    await tx.workspaceCreditBalance.create({
      data: { workspaceId: workspace.id, balance: 1 },
    });
    await tx.creditTransaction.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        type: 'WELCOME_GRANT',
        amount: 1,
        description: 'Welcome credits',
        idempotencyKey: `welcome:${workspace.id}`,
      },
    });
    return workspace.id;
  });
}

async function createTestUser() {
  try {
    let user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });

    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: hashedPassword,
          platformRole: 'USER',
          status: 'ACTIVE',
          emailVerified: new Date(),
        },
      });
      console.log('Test user created.');
    } else {
      // Make repeated runs idempotent and usable even if email verification
      // was introduced after the account was first created.
      user = await prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', emailVerified: user.emailVerified ?? new Date() },
      });
      console.log('Test user already exists.');
    }

    const workspaceId = await ensureWorkspace(user);

    console.log('Account ready:');
    console.log(`   Email:    ${user.email}`);
    console.log(`   Password: password123`);
    console.log(`   User ID:  ${user.id}`);
    console.log(`   Workspace: ${workspaceId}`);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();