import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, CalendarClock, Mail, Phone, UserRound } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { getAuthContext, hasPermission } from '@/lib/auth/workspace';
import { leadWhereForContext } from '@/lib/leads/query';
import { leadSourceLabel, splitLeadName } from '@/lib/leads/sources';
import { PageHead } from '@/components/admin/ui/page-head';
import { EmailLeadButton } from '@/components/portal/email-lead-button';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx || !hasPermission(ctx, 'VIEW_LEADS')) {
    notFound();
  }

  const { id } = await params;
  const lead = await prisma.propertyInquiry.findFirst({
    where: { id, ...leadWhereForContext(ctx) },
    include: {
      order: {
        select: {
          id: true,
          slug: true,
          propertyAddress: true,
          propertyFormattedAddress: true,
        },
      },
    },
  });

  if (!lead) notFound();

  const names = splitLeadName(lead.name);
  const address =
    lead.order?.propertyFormattedAddress || lead.order?.propertyAddress || '';
  const displayName = `${names.firstName} ${names.lastName}`.trim() || lead.name;

  return (
    <div className="w-full space-y-6">
      <Link
        href="/portal/leads"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <PageHead
        title={displayName}
        subtitle={`Captured ${lead.createdAt.toLocaleString()} · ${leadSourceLabel(lead.source)}`}
        actions={
          lead.email ? (
            <EmailLeadButton
              leadId={lead.id}
              leadName={displayName}
              leadEmail={lead.email}
              propertyAddress={address}
            />
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="mb-3 font-display text-[15px] font-semibold">Contact information</h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" /> Name
              </dt>
              <dd className="mt-1 text-[14px]">{displayName || '—'}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Email
              </dt>
              <dd className="mt-1 text-[14px]">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> Phone
              </dt>
              <dd className="mt-1 text-[14px]">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="hover:underline">
                    {lead.phone}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> Captured
              </dt>
              <dd className="mt-1 text-[14px]">{lead.createdAt.toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 font-display text-[15px] font-semibold">Lead details</h3>
          <div className="space-y-3 text-[13.5px]">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Source</div>
              <div className="mt-1 inline-flex rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium">
                {leadSourceLabel(lead.source)}
              </div>
            </div>
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
                Property
              </div>
              <div className="mt-1 flex items-start gap-1.5">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                {lead.order ? (
                  <Link
                    href={`/portal/orders/${lead.order.id}`}
                    className="hover:underline"
                  >
                    {address || 'View listing'}
                  </Link>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {lead.message ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-2 font-display text-[15px] font-semibold">Message</h3>
          <p className="whitespace-pre-wrap text-[13.5px] leading-6 text-muted-foreground">
            {lead.message}
          </p>
        </div>
      ) : null}
    </div>
  );
}
