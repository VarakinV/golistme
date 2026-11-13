import type { Permission, PlatformRole, WorkspaceRole } from "@prisma/client";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import {
  type AuthContext,
  hasPermission,
  isPlatformAdmin,
  listingWhereForContext,
} from "@/lib/auth/workspace-policy";

export type { AuthContext };
export { hasPermission, isPlatformAdmin, listingWhereForContext };

export const ACTIVE_WORKSPACE_COOKIE = "golist_active_workspace";

export class WorkspaceAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "WorkspaceAccessError";
    this.status = status;
  }
}

/**
 * Resolve the caller and the active workspace from the database. JWT claims are
 * not trusted for authorization; the token only provides the user id.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();
  const user = session?.user as Record<string, unknown> | undefined;
  const userId = user?.id as string | undefined;
  if (!userId) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      platformRole: true,
      status: true,
      emailVerified: true,
      lastActiveWorkspaceId: true,
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { workspaceId: true, role: true, permissions: true },
      },
    },
  });

  if (!dbUser || dbUser.status !== "ACTIVE") return null;

  if (dbUser.platformRole === "ADMIN" || dbUser.platformRole === "SUPERADMIN") {
    return {
      userId,
      platformRole: dbUser.platformRole,
      workspaceId: null,
      workspaceRole: null,
      permissions: [],
      emailVerified: dbUser.emailVerified !== null,
    };
  }

  const store = await cookies();
  const requested = store.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const membership =
    (requested && dbUser.memberships.find((m) => m.workspaceId === requested)) ||
    (dbUser.lastActiveWorkspaceId &&
      dbUser.memberships.find(
        (m) => m.workspaceId === dbUser.lastActiveWorkspaceId
      )) ||
    dbUser.memberships[0];

  return {
    userId,
    platformRole: dbUser.platformRole,
    workspaceId: membership?.workspaceId ?? null,
    workspaceRole: membership?.role ?? null,
    permissions: membership?.permissions ?? [],
    emailVerified: dbUser.emailVerified !== null,
  };
}

/** Block workspace mutations until the account email is confirmed. */
export function requireVerifiedEmail(ctx: AuthContext): void {
  if (ctx.emailVerified === false) {
    throw new WorkspaceAccessError("Email verification required", 403);
  }
}

export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new WorkspaceAccessError("Unauthorized", 401);
  return ctx;
}

/** Verify membership from the database, not from JWT claims. */
export async function requireWorkspaceMember(
  ctx: AuthContext,
  workspaceId: string,
  permission?: Permission
): Promise<{ role: WorkspaceRole; permissions: Permission[] }> {
  if (isPlatformAdmin(ctx)) {
    return { role: "OWNER", permissions: ["MANAGE_LISTINGS", "GENERATE_MARKETING", "VIEW_LEADS", "VIEW_ANALYTICS", "PURCHASE_CREDITS"] };
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ctx.userId } },
    select: { role: true, permissions: true, status: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new WorkspaceAccessError("Forbidden", 403);
  }
  if (permission && !membership.permissions.includes(permission)) {
    throw new WorkspaceAccessError("Missing permission", 403);
  }
  return { role: membership.role, permissions: membership.permissions };
}

/** Verify a listing belongs to the caller's workspace. */
export async function assertListingAccess(ctx: AuthContext, listingId: string): Promise<void> {
  const allowed = await prisma.listing.findFirst({
    where: { id: listingId, ...listingWhereForContext(ctx) },
    select: { id: true },
  });
  if (!allowed) throw new WorkspaceAccessError("Listing not found", 404);
}

/**
 * Resolve the caller and verify the listing belongs to their workspace.
 * Fails closed for authenticated users who have no active workspace.
 */
export async function requireListingAccess(listingId: string): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new WorkspaceAccessError("Unauthorized", 401);
  if (!isPlatformAdmin(ctx) && !ctx.workspaceId) {
    throw new WorkspaceAccessError("Forbidden", 403);
  }
  await assertListingAccess(ctx, listingId);
  return ctx;
}

/** Verify listing access plus a specific workspace permission. */
export async function requireListingPermission(
  listingId: string,
  permission: Permission
): Promise<AuthContext> {
  const ctx = await requireListingAccess(listingId);
  if (!hasPermission(ctx, permission)) {
    throw new WorkspaceAccessError("Missing permission", 403);
  }
  return ctx;
}

/** Verify a workspace is accessible to the caller. */
export async function assertWorkspaceAccess(
  ctx: AuthContext,
  workspaceId: string,
  permission?: Permission
): Promise<void> {
  await requireWorkspaceMember(ctx, workspaceId, permission);
}
