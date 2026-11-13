'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { PageHead } from '@/components/admin/ui/page-head';
import { KpiCard } from '@/components/admin/ui/kpi-card';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { OrdersBarChart, AovLineChart } from '@/components/admin/dashboard/charts';
import { ChevronRight, MapPin, Package, TrendingUp, DollarSign, Calendar, ExternalLink, PlusCircle, UserPlus } from 'lucide-react';
import LoginSuccessToaster from '@/components/portal/LoginSuccessToaster';

type DashboardStats = {
  totals: { month: number; allTime: number };
  byMonth: { year: number; series: number[] };
  aovByMonth: { year: number; series: number[] };
  topRealtors: {
    count: number;
    realtor: {
      id: string;
      firstName: string;
      lastName: string;
      headshot?: string | null;
    };
  }[];
  lastOrders: {
    id: string;
    propertyAddress: string;
    createdAt: string;
    status: string;
    realtor: { firstName: string; lastName: string };
  }[];
};

function money(cents: number) {
  return '$' + (cents / 100).toFixed(0);
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session } = useSession();

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4],
    [currentYear]
  );
  const [year, setYear] = useState<number>(currentYear);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingStats(true);
      try {
        const res = await fetch(`/api/admin/dashboard?year=${year}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load stats');
        if (!cancelled) setStats(data as DashboardStats);
      } catch (e) {
        console.error(e);
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const now = new Date();
  const monthIdx = now.getMonth();
  const firstName = (session?.user?.name || session?.user?.email || 'there').split(' ')[0];

  const monthDelta = useMemo(() => {
    if (!stats || monthIdx === 0) return null;
    const prev = stats.byMonth.series[monthIdx - 1];
    const cur = stats.byMonth.series[monthIdx];
    if (cur === prev) return 'Same as last month';
    return `${Math.abs(cur - prev)} ${cur > prev ? 'more' : 'fewer'} than last month`;
  }, [stats, monthIdx]);

  const aovNow = stats?.aovByMonth.series[monthIdx] ?? 0;
  const aovDelta = useMemo(() => {
    if (!stats || monthIdx === 0) return null;
    const prev = stats.aovByMonth.series[monthIdx - 1];
    if (aovNow === prev) return 'Same as last month';
    const diff = aovNow - prev;
    return `${diff > 0 ? '+' : '−'}$${Math.abs(diff / 100).toFixed(0)} vs last month`;
  }, [stats, monthIdx, aovNow]);

  return (
    <div className="w-full">
      <Suspense>
        <LoginSuccessToaster />
      </Suspense>

      <PageHead
        title={`Welcome back, ${firstName}`}
        subtitle="Here's what's happening across your listings this month."
        actions={
          <>
            <button
              type="button"
              onClick={() => router.push('/admin/clients?new=1')}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-[13.5px] font-semibold hover:border-navy-600 hover:bg-surface-2"
            >
              <UserPlus className="h-4 w-4" /> Add realtor
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/orders/new')}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-navy-700 px-4 text-[13.5px] font-semibold text-white hover:bg-navy-600 dark:bg-navy-600 dark:hover:bg-[#3a4d85]"
            >
              <PlusCircle className="h-4 w-4" /> New order
            </button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          icon={Package}
          label="Orders this month"
          value={loadingStats || !stats ? '—' : stats.totals.month}
          delta={monthDelta ?? 'Current month'}
        />
        <KpiCard
          icon={TrendingUp}
          label="Orders — all time"
          value={loadingStats || !stats ? '—' : stats.totals.allTime}
          delta="Since launch"
          tone="navy"
        />
        <KpiCard
          icon={DollarSign}
          label="Avg. order value"
          value={loadingStats || !stats ? '—' : aovNow ? money(aovNow) : '—'}
          delta={aovDelta ?? 'Current month'}
        />
      </div>
      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4.5">
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-[15px] font-semibold">Orders by month</h3>
              <div className="mt-0.5 text-xs text-muted-foreground">Monthly totals</div>
            </div>
            <select
              aria-label="Year"
              className="field w-auto py-1.5 text-xs"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {loadingStats || !stats ? (
            <div className="flex h-[230px] items-center justify-center text-muted-foreground">
              Loading chart…
            </div>
          ) : (
            <OrdersBarChart series={stats.byMonth.series} />
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4.5">
          <div className="mb-3.5">
            <h3 className="font-display text-[15px] font-semibold">Average order value</h3>
            <div className="mt-0.5 text-xs text-muted-foreground">Per transaction, {year}</div>
          </div>
          {loadingStats || !stats ? (
            <div className="flex h-[230px] items-center justify-center text-muted-foreground">
              Loading chart…
            </div>
          ) : (
            <AovLineChart
              series={stats.aovByMonth.series.map((cents) =>
                Math.round(cents / 100)
              )}
            />
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4.5">
          <div className="mb-2">
            <h3 className="font-display text-[15px] font-semibold">Top realtors this month</h3>
            <div className="mt-0.5 text-xs text-muted-foreground">By number of orders</div>
          </div>
          {loadingStats || !stats ? (
            <div className="flex h-20 items-center justify-center text-muted-foreground">
              Loading…
            </div>
          ) : stats.topRealtors.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data for this month</div>
          ) : (
            <div>
              {stats.topRealtors.map((item, i) => (
                <div
                  key={item.realtor.id}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ${
                      i === 0
                        ? 'bg-brick-500 text-white'
                        : 'border-[1.5px] border-border text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                    {item.realtor.firstName} {item.realtor.lastName}
                  </span>
                  <span className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-navy-700 dark:text-[#aab4e6]">
                    {item.count} order{item.count > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-[15px] font-semibold">Recent orders</h3>
              <div className="mt-0.5 text-xs text-muted-foreground">Latest activity</div>
            </div>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-[12.5px] font-semibold text-brick-600 hover:underline dark:text-brick-500"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loadingStats || !stats ? (
            <div className="flex h-20 items-center justify-center text-muted-foreground">
              Loading…
            </div>
          ) : stats.lastOrders.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recent orders</div>
          ) : (
            <div>
              {stats.lastOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-border bg-surface-2 text-brick-500">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.3px] font-medium">{o.propertyAddress}</div>
                    <StatusPill status={o.status} className="mt-0.5" />
                  </div>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-semibold text-muted-foreground hover:border-brick-tint-strong hover:text-brick-600"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
