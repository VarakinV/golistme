import { getAuthContext } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { OrdersSearchInput } from '@/components/portal/orders-search';
import { PageHead } from '@/components/admin/ui/page-head';
import { StatusPill } from '@/components/admin/ui/status-pill';
import LoginSuccessToaster from '@/components/portal/LoginSuccessToaster';

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; loginSuccess?: string }>;
}) {
  const ctx = await getAuthContext();

  if (!ctx) {
    return (
      <div className="p-6">
        <p>
          Please{' '}
          <Link href="/login" className="underline">
            sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const loginSuccess = sp?.loginSuccess;

  const isAdmin = ctx.platformRole === 'ADMIN' || ctx.platformRole === 'SUPERADMIN';
  if (isAdmin) {
    const suffix = loginSuccess ? `?loginSuccess=1` : '';
    redirect(`/admin/dashboard${suffix}`);
  }

  const workspaceId = ctx.workspaceId;
  if (!workspaceId) {
    redirect('/no-workspace');
  }

  const { q: qParam } = sp;
  const q = (qParam || '').trim();
  const recentLimit = 5;

  const baseWhere = { realtorId: workspaceId };
  const where = q
    ? {
        AND: [
          baseWhere,
          { propertyAddress: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : baseWhere;

  const [listings, workspace] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: recentLimit,
      select: { id: true, slug: true, propertyAddress: true, status: true },
    }),
    prisma.realtorWorkspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, creditBalance: { select: { balance: true } } },
    }),
  ]);

  const credits = workspace?.creditBalance?.balance ?? 0;

  return (
    <div className="w-full space-y-6">
      <LoginSuccessToaster />

      <PageHead
        title={workspace?.name ?? 'Customer Portal'}
        subtitle="Manage your listings and marketing assets"
        actions={
          <Button asChild className="gap-2">
            <Link href="/portal/orders/new">+ Create Listing</Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-4.5 sm:p-6">
          <h2 className="font-display text-[16px] font-semibold">Credits</h2>
          <p className="mt-1 text-3xl font-semibold">{credits}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Credits are used for video re-renders and premium assets.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4.5 sm:p-6">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-display text-[16px] font-semibold">Recent listings</h2>
            <div className="ml-auto w-full sm:w-64">
              <OrdersSearchInput initialQ={q} />
            </div>
          </div>
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {listings.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{o.propertyAddress}</div>
                    <StatusPill status={o.status} className="mt-0.5" />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button variant="outline" asChild size="sm">
                      <Link href={`/portal/orders/${o.id}`}>Edit Listing</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/p/${o.slug}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" /> Public page
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 text-center">
            <Button variant="outline" asChild size="sm">
              <Link href="/portal/orders">View all listings</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}