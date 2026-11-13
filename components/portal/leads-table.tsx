'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Contact,
} from 'lucide-react';
import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCES,
  LEADS_PER_PAGE_OPTIONS,
  leadSourceLabel,
} from '@/lib/leads/sources';
import { requestPermission, showErrorDialog } from '@/lib/ui/feedback';

export interface LeadRow {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string;
  createdAt: string;
  address: string;
  slug: string | null;
}

export function LeadsTable({
  leads,
  total,
  page,
  perPage,
  q,
  source,
}: {
  leads: LeadRow[];
  total: number;
  page: number;
  perPage: number;
  q: string;
  source: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [draftSources, setDraftSources] = useState<string[]>([]);
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const selectedSources = source ? source.split(',').filter(Boolean) : [];
  const sourceLabel =
    selectedSources.length === 0
      ? 'All lead sources'
      : selectedSources.length === 1
        ? LEAD_SOURCE_LABELS[selectedSources[0] as keyof typeof LEAD_SOURCE_LABELS] ||
          leadSourceLabel(selectedSources[0])
        : `${selectedSources.length} lead sources`;

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query === q) return;
      pushParams({ q: query, page: '1' });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = { q, source, perPage: String(perPage), page: String(page), ...next };
    if (merged.q) params.set('q', merged.q);
    if (merged.source) params.set('source', merged.source);
    if (merged.perPage && merged.perPage !== '20') params.set('perPage', merged.perPage);
    if (merged.page && merged.page !== '1') params.set('page', merged.page);
    router.push(`/portal/leads${params.toString() ? `?${params}` : ''}`);
  }

  function toggleDraftSource(value: string) {
    setDraftSources((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function applySources() {
    pushParams({ source: draftSources.join(','), page: '1' });
    setSourceOpen(false);
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (source) params.set('source', source);
      if (selectedIds.length) params.set('ids', selectedIds.join(','));
      const res = await fetch(`/api/leads/export?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) requestPermission('export leads');
        else showErrorDialog('The leads could not be exported. Please try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, or address"
            className="pl-9"
          />
        </div>
        <DropdownMenu
          open={sourceOpen}
          onOpenChange={(open) => {
            setSourceOpen(open);
            if (open) setDraftSources(selectedSources);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between sm:w-56"
            >
              <span className="truncate">{sourceLabel}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Lead sources</DropdownMenuLabel>
            <div className="px-1 pb-1">
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draftSources.length === 0}
                  onChange={() => setDraftSources([])}
                />
                All lead sources
              </label>
              {LEAD_SOURCES.map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={draftSources.includes(value)}
                    onChange={() => toggleDraftSource(value)}
                  />
                  {LEAD_SOURCE_LABELS[value]}
                </label>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button type="button" size="sm" className="w-full" onClick={applySources}>
                Apply
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select
            value={String(perPage)}
            onValueChange={(value) => pushParams({ perPage: value, page: '1' })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEADS_PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={exportCsv}
            disabled={exporting || total === 0}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export{selectedIds.length ? ` (${selectedIds.length})` : ''}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Contact className="h-8 w-8 text-faint" />
            <div className="font-medium">No leads found</div>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Leads captured from your property pages and QR codes will appear here.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={allSelected}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? Object.fromEntries(leads.map((l) => [l.id, true]))
                            : {}
                        )
                      }
                      aria-label="Select all leads"
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Property</th>
                  <th>Source</th>
                  <th>Captured</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-2"
                    onClick={() => router.push(`/portal/leads/${lead.id}`)}
                  >
                    <td data-label="">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!selected[lead.id]}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setSelected((s) => ({ ...s, [lead.id]: e.target.checked }))
                        }
                        aria-label={`Select ${lead.name}`}
                      />
                    </td>
                    <td data-label="Name" className="td-primary">
                      <Link
                        href={`/portal/leads/${lead.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {lead.firstName} {lead.lastName}
                      </Link>
                    </td>
                    <td data-label="Email">{lead.email || '—'}</td>
                    <td data-label="Phone">{lead.phone || '—'}</td>
                    <td data-label="Property">
                      <span className="line-clamp-1">{lead.address || '—'}</span>
                    </td>
                    <td data-label="Source">
                      <span className="inline-flex rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium">
                        {leadSourceLabel(lead.source)}
                      </span>
                    </td>
                    <td data-label="Captured">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted-foreground">
        <div>
          {total === 0
            ? 'No leads'
            : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total}`}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => pushParams({ page: String(page - 1) })}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => pushParams({ page: String(page + 1) })}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
