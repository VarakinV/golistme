import type { Prisma } from "@prisma/client";
import { isPlatformAdmin, type AuthContext } from "@/lib/auth/workspace";
import { LEAD_SOURCES, type LeadSourceValue } from "@/lib/leads/sources";

export function leadWhereForContext(ctx: AuthContext): Prisma.PropertyInquiryWhereInput {
  if (isPlatformAdmin(ctx)) return {};
  return { workspaceId: ctx.workspaceId ?? "__no_workspace__" };
}

export function buildLeadWhere(
  ctx: AuthContext,
  options: { q?: string | null; source?: string | null }
): Prisma.PropertyInquiryWhereInput {
  const where: Prisma.PropertyInquiryWhereInput = { ...leadWhereForContext(ctx) };
  const q = options.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { order: { propertyAddress: { contains: q, mode: "insensitive" } } },
    ];
  }
  const sources = (options.source || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is LeadSourceValue =>
      LEAD_SOURCES.includes(value as LeadSourceValue)
    );
  if (sources.length) {
    where.source = { in: sources };
  }
  return where;
}

