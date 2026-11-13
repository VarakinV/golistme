import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, type Permission } from "@prisma/client";
import {
  hasPermission,
  isPlatformAdmin,
  listingWhereForContext,
  type AuthContext,
} from "@/lib/auth/workspace-policy";

const ALL: Permission[] = [
  "MANAGE_LISTINGS",
  "GENERATE_MARKETING",
  "VIEW_LEADS",
  "VIEW_ANALYTICS",
  "PURCHASE_CREDITS",
];

function ctx(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: "user_1",
    platformRole: "USER",
    workspaceId: "ws_1",
    workspaceRole: "OWNER",
    permissions: ALL,
    ...overrides,
  };
}

describe("workspace policy (pure)", () => {
  it("scopes a normal user to their own workspace", () => {
    expect(listingWhereForContext(ctx())).toEqual({ realtorId: "ws_1" });
  });

  it("denies everything when a user has no workspace", () => {
    const where = listingWhereForContext(ctx({ workspaceId: null, workspaceRole: null }));
    expect(where).toEqual({ id: { in: [] } });
  });

  it("lets platform admins see all listings", () => {
    expect(listingWhereForContext(ctx({ platformRole: "ADMIN", workspaceId: null }))).toEqual({});
    expect(listingWhereForContext(ctx({ platformRole: "SUPERADMIN", workspaceId: null }))).toEqual({});
  });

  it("recognizes platform admins", () => {
    expect(isPlatformAdmin(ctx({ platformRole: "ADMIN" }))).toBe(true);
    expect(isPlatformAdmin(ctx({ platformRole: "SUPERADMIN" }))).toBe(true);
    expect(isPlatformAdmin(ctx({ platformRole: "USER" }))).toBe(false);
  });

  it("honors membership permissions", () => {
    const assistant = ctx({
      workspaceRole: "ASSISTANT",
      permissions: ["MANAGE_LISTINGS", "VIEW_LEADS"],
    });
    expect(hasPermission(assistant, "MANAGE_LISTINGS")).toBe(true);
    expect(hasPermission(assistant, "PURCHASE_CREDITS")).toBe(false);
  });

  it("gives platform admins every permission", () => {
    const admin = ctx({ platformRole: "ADMIN", permissions: [] });
    expect(hasPermission(admin, "PURCHASE_CREDITS")).toBe(true);
  });
});

describe("workspace isolation (database)", () => {
  const prisma = new PrismaClient();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let userA: { id: string };
  let userB: { id: string };
  let workspaceA: { id: string };
  let workspaceB: { id: string };
  let listingA: { id: string };
  let listingB: { id: string };

  beforeAll(async () => {
    userA = await prisma.user.create({
      data: {
        email: `isolation-a-${stamp}@example.test`,
        password: "not-a-real-hash",
        name: "Isolation A",
        platformRole: "USER",
      },
      select: { id: true },
    });
    userB = await prisma.user.create({
      data: {
        email: `isolation-b-${stamp}@example.test`,
        password: "not-a-real-hash",
        name: "Isolation B",
        platformRole: "USER",
      },
      select: { id: true },
    });

    workspaceA = await prisma.realtorWorkspace.create({
      data: { slug: `iso-a-${stamp}`, name: "Isolation A", ownerUserId: userA.id },
      select: { id: true },
    });
    workspaceB = await prisma.realtorWorkspace.create({
      data: { slug: `iso-b-${stamp}`, name: "Isolation B", ownerUserId: userB.id },
      select: { id: true },
    });

    await prisma.workspaceMembership.createMany({
      data: [
        {
          workspaceId: workspaceA.id,
          userId: userA.id,
          role: "OWNER",
          permissions: ALL,
          status: "ACTIVE",
        },
        {
          workspaceId: workspaceB.id,
          userId: userB.id,
          role: "OWNER",
          permissions: ALL,
          status: "ACTIVE",
        },
      ],
    });

    listingA = await prisma.listing.create({
      data: {
        realtorId: workspaceA.id,
        slug: `iso-listing-a-${stamp}`,
        propertyAddress: "1 Isolation Way",
      },
      select: { id: true },
    });
    listingB = await prisma.listing.create({
      data: {
        realtorId: workspaceB.id,
        slug: `iso-listing-b-${stamp}`,
        propertyAddress: "2 Isolation Way",
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    await prisma.realtorWorkspace.deleteMany({
      where: { id: { in: [workspaceA?.id, workspaceB?.id].filter(Boolean) as string[] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA?.id, userB?.id].filter(Boolean) as string[] } },
    });
    await prisma.$disconnect();
  });

  it("returns only the caller's workspace listings", async () => {
    const where = listingWhereForContext({
      userId: userA.id,
      platformRole: "USER",
      workspaceId: workspaceA.id,
      workspaceRole: "OWNER",
      permissions: ALL,
    });

    const visible = await prisma.listing.findMany({
      where: { id: { in: [listingA.id, listingB.id] }, ...where },
      select: { id: true },
    });

    expect(visible.map((row) => row.id)).toEqual([listingA.id]);
  });

  it("denies cross-workspace access by direct id", async () => {
    const where = listingWhereForContext({
      userId: userA.id,
      platformRole: "USER",
      workspaceId: workspaceA.id,
      workspaceRole: "OWNER",
      permissions: ALL,
    });

    const denied = await prisma.listing.findFirst({
      where: { id: listingB.id, ...where },
      select: { id: true },
    });

    expect(denied).toBeNull();
  });

  it("returns nothing for a user without a workspace", async () => {
    const where = listingWhereForContext({
      userId: userA.id,
      platformRole: "USER",
      workspaceId: null,
      workspaceRole: null,
      permissions: [],
    });

    const visible = await prisma.listing.findMany({ where, select: { id: true } });
    expect(visible).toEqual([]);
  });

  it("lets a platform admin see both workspaces", async () => {
    const where = listingWhereForContext({
      userId: "admin_1",
      platformRole: "ADMIN",
      workspaceId: null,
      workspaceRole: null,
      permissions: [],
    });

    const visible = await prisma.listing.findMany({
      where: { id: { in: [listingA.id, listingB.id] }, ...where },
      select: { id: true },
    });

    expect(visible.length).toBe(2);
  });
});