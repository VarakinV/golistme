import { getAuthContext, hasPermission, listingWhereForContext } from '@/lib/auth/workspace';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { PageHead } from '@/components/admin/ui/page-head';
import { OrdersSearchInput } from '@/components/portal/orders-search';
import { ListingStatusSelect } from '@/components/portal/listing-status-select';
import { DeleteListingButton } from '@/components/portal/delete-listing-button';
import { CreateListingButton } from '@/components/portal/create-listing-button';
import { PerPageSelect } from '@/components/portal/per-page-select';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { TableShell } from '@/components/admin/ui/table-shell';
import { PackageOpen } from 'lucide-react';

export default async function PortalOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; perPage?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return <div className="p-6">Unauthorized</div>;
  const canManageListings = hasPermission(ctx, 'MANAGE_LISTINGS');

  const baseWhere = listingWhereForContext(ctx);

  const { page: pageParam, q: qParam, perPage: perPageParam } = await searchParams;
  const q = (qParam || '').trim();
  const where = q
    ? {
        AND: [
          baseWhere,
          { propertyAddress: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : baseWhere;

  const page = Math.max(1, Number(pageParam) || 1);
  const allowedPerPage = [10, 20, 50];
  const perPage = allowedPerPage.includes(Number(perPageParam))
    ? Number(perPageParam)
    : 10;
  const total = await prisma.listing.count({ where });
  const orders = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * perPage,
    take: perPage,
    select: { id: true, slug: true, propertyAddress: true, status: true },
  });

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const qs = (p: number) =>
    `/portal/orders?page=${p}&perPage=${perPage}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <div className="w-full space-y-6">
      <PageHead
        title="My Listings"
        subtitle="View and manage your listings"
        actions={
          <CreateListingButton canManage={canManageListings} />
        }
      />

      <TableShell
        toolbar={
          <div className="mb-3.5 flex flex-wrap items-center gap-3">
            <PerPageSelect current={perPage} q={q} />
            <div className="ml-auto w-full sm:w-64">
              <OrdersSearchInput initialQ={q} />
            </div>
          </div>
        }
      >
        {orders.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={q ? 'No orders found' : 'No listings yet'}
            description={
              q
                ? 'No orders match your search.'
                : 'Create your first listing to start building marketing assets.'
            }
            action={
              !q ? (
                <CreateListingButton canManage={canManageListings} />
              ) : undefined
            }
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>Property</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-border last:border-b-0 hover:bg-surface-2"
                >
                  <td data-label="Property" className="td-primary">
                    <Link
                      href={`/portal/orders/${o.id}`}
                      className="font-medium text-navy-700 hover:underline dark:text-[#9db5f2]"
                    >
                      {o.propertyAddress}
                    </Link>
                  </td>
                  <td data-label="Status">
                    <ListingStatusSelect listingId={o.id} status={o.status} />
                  </td>
                  <td data-label="Actions">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <Button variant="outline" asChild size="sm">
                        <Link href={`/portal/orders/${o.id}`}>
                          {canManageListings ? 'Edit Listing' : 'View Listing'}
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/p/${o.slug}`} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" /> Public Page
                        </Link>
                      </Button>
                      <DeleteListingButton
                        listingId={o.id}
                        listingLabel={o.propertyAddress}
                        canDelete={canManageListings}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      {/* Pagination links */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button variant="outline" asChild size="sm">
              <Link href={qs(page - 1)}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          {page < totalPages ? (
            <Button variant="outline" asChild size="sm">
              <Link href={qs(page + 1)}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
