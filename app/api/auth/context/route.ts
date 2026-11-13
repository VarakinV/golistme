import { NextResponse } from 'next/server';
import { getAuthContext, hasPermission } from '@/lib/auth/workspace';

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    workspaceId: ctx.workspaceId,
    platformRole: ctx.platformRole,
    permissions: ctx.permissions,
    canManageListings: hasPermission(ctx, 'MANAGE_LISTINGS'),
    canGenerateMarketing: hasPermission(ctx, 'GENERATE_MARKETING'),
    canViewLeads: hasPermission(ctx, 'VIEW_LEADS'),
    canViewAnalytics: hasPermission(ctx, 'VIEW_ANALYTICS'),
    canPurchaseCredits: hasPermission(ctx, 'PURCHASE_CREDITS'),
  });
}
