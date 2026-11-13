import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ALL_PERMISSIONS, WELCOME_CREDITS } from "@/lib/config/credits";

type Tx = Prisma.TransactionClient;

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "workspace";
}

async function uniqueWorkspaceSlug(tx: Tx, base: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? root : `${root}-${crypto.randomBytes(2).toString("hex")}`;
    const exists = await tx.realtorWorkspace.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${root}-${crypto.randomBytes(4).toString("hex")}`;
}

export type CreateWorkspaceInput = {
  userId: string;
  name: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
};

/**
 * Creates a workspace inside an existing transaction, makes the user its OWNER,
 * and records the welcome credits so the ledger and cached balance cannot drift.
 */
export async function createWorkspaceForUserTx(tx: Tx, input: CreateWorkspaceInput) {
  const slug = await uniqueWorkspaceSlug(tx, input.companyName || input.name || input.email || "workspace");
  const parts = (input.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = input.firstName ?? parts[0] ?? null;
  const lastName = input.lastName ?? (parts.length > 1 ? parts.slice(1).join(" ") : null);

  const workspace = await tx.realtorWorkspace.create({
    data: {
      slug,
      name: input.companyName || input.name,
      ownerUserId: input.userId,
      email: input.email ?? null,
      firstName,
      lastName,
      companyName: input.companyName ?? null,
    },
  });

  await tx.workspaceMembership.create({
    data: {
      workspaceId: workspace.id,
      userId: input.userId,
      role: "OWNER",
      permissions: ALL_PERMISSIONS,
      status: "ACTIVE",
    },
  });

  await tx.workspaceCreditBalance.create({
    data: { workspaceId: workspace.id, balance: WELCOME_CREDITS },
  });

  if (WELCOME_CREDITS > 0) {
    await tx.creditTransaction.create({
      data: {
        workspaceId: workspace.id,
        userId: input.userId,
        type: "WELCOME_GRANT",
        amount: WELCOME_CREDITS,
        description: "Welcome credits",
        idempotencyKey: `welcome:${workspace.id}`,
      },
    });
  }

  return workspace;
}

/** Standalone variant used outside an existing transaction. */
export async function createWorkspaceForUser(input: CreateWorkspaceInput) {
  return prisma.$transaction((tx) => createWorkspaceForUserTx(tx, input));
}
