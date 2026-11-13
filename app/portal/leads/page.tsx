import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { getAuthContext, hasPermission } from '@/lib/auth/workspace';
import { buildLeadWhere } from '@/lib/leads/query';
import { normalizeLeadsPaging, splitLeadName } from '@/lib/leads/sources';
import { PageHead } from '@/components/admin/ui/page-head';
import { Button } from '@/components/ui/button';
import { LeadsTable, type LeadRow } from '@/components/portal/leads-table';

export const dynamic = 'force-dynamic';

export default async function PortalLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return <div className="p-6">Unauthorized</div>;
  }

  if (!hasPermission(ctx, 'VIEW_LEADS')) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <ShieldX className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-semibold">Permission needed</h2>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-6 text-muted-foreground">
            You don&apos;t have permission to view leads in this workspace. Ask the
            workspace owner to update your permissions.
          </p>
          <Button asChild className="mt-5">
            <Link href="/portal/orders">Back to my listings</Link>
          </Button>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const source = typeof sp.source === 'string' ? sp.source : '';
  const { page, perPage } = normalizeLeadsPaging(
    typeof sp.page === 'string' ? sp.page : null,
    typeof sp.perPage === 'string' ? sp.perPage : null
  );

  const where = buildLeadWhere(ctx, { q, source });

  const [total, leads] = await prisma.$transaction([
    prisma.propertyInquiry.count({ where }),
    prisma.propertyInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        order: {
          select: {
            propertyAddress: true,
            propertyFormattedAddress: true,
            slug: true,
          },
        },
      },
    }),
  ]);

  const rows: LeadRow[] = leads.map((lead) => {
    const names = splitLeadName(lead.name);
    return {
      id: lead.id,
      name: lead.name,
      firstName: names.firstName,
      lastName: names.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      createdAt: lead.createdAt.toISOString(),
      address:
        lead.order?.propertyFormattedAddress || lead.order?.propertyAddress || '',
      slug: lead.order?.slug ?? null,
    };
  });

  return (
    <div className="w-full space-y-6">
      <PageHead
        title="Leads"
        subtitle="People who contacted you through your property pages and QR codes"
      />
      <LeadsTable
        key={`${q}-${source}-${page}-${perPage}`}
        leads={rows}
        total={total}
        page={page}
        perPage={perPage}
        q={q}
        source={source}
      />
    </div>
  );
}
