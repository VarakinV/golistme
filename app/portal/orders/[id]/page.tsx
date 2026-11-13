import {
  getAuthContext,
  hasPermission,
  listingWhereForContext,
} from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import { PortalOrderDetails } from '@/components/portal/PortalOrderDetails';

export default async function PortalOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) return notFound();

  const order = await prisma.listing.findFirst({
    where: { id, ...listingWhereForContext(ctx) },
    include: { realtor: true },
  });
  if (!order) return notFound();

  return (
    <div className="w-full">
      <PortalOrderDetails
        orderId={id}
        canManageListings={hasPermission(ctx, 'MANAGE_LISTINGS')}
        canGenerateMarketing={hasPermission(ctx, 'GENERATE_MARKETING')}
        canViewAnalytics={hasPermission(ctx, 'VIEW_ANALYTICS')}
        canViewLeads={hasPermission(ctx, 'VIEW_LEADS')}
      />
    </div>
  );
}
