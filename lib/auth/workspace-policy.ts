import type { Permission, PlatformRole, Prisma, WorkspaceRole } from "@prisma/client";

export type AuthContext = {
  userId: string;
  platformRole: PlatformRole;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  permissions: Permission[];
  emailVerified?: boolean;
};

export function isPlatformAdmin(ctx: Pick<AuthContext, "platformRole">): boolean {
  return ctx.platformRole === "ADMIN" || ctx.platformRole === "SUPERADMIN";
}

export function hasPermission(ctx: AuthContext, permission: Permission): boolean {
  return isPlatformAdmin(ctx) || ctx.permissions.includes(permission);
}

/**
 * Prisma filter for Listing queries. Platform admins see everything; everyone
 * else only sees listings owned by their active workspace.
 */
export function listingWhereForContext(ctx: AuthContext): Prisma.ListingWhereInput {
  if (isPlatformAdmin(ctx)) return {};
  if (!ctx.workspaceId) return { id: { in: [] } };
  return { realtorId: ctx.workspaceId };
}