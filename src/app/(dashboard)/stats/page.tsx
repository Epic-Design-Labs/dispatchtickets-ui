'use client';

import { useMemo, useState } from 'react';
import { useDashboardStats, useDashboardTrends, useBrands } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, MessageCircle, Layers } from 'lucide-react';
import { StatusTabs } from '@/components/tickets';
import { BrandTile } from '@/components/brand-tile';
import { cn } from '@/lib/utils';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RANGES = [7, 30, 90] as const;

function formatChartDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '--';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/** One figure under the chart: a number and what it counts. */
function VolumeStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function StatsPage() {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [days, setDays] = useState<number>(30);
  const { data: brands } = useBrands();
  const { data: stats, isLoading: statsLoading } = useDashboardStats({
    brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
    days,
  });
  const { data: trends, isLoading: trendsLoading } = useDashboardTrends({
    brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
    days,
  });

  const brandName =
    selectedBrands.length === 0
      ? 'all brands'
      : brands?.find((b) => b.id === selectedBrands[0])?.name ?? 'this brand';

  /**
   * Everything the volume panel reports is summed from the SAME series the
   * chart draws, so a figure here can never disagree with the line above it.
   *
   * `resolved` is the API's own definition -- tickets now resolved or closed
   * whose last update fell on that day -- so the backlog figure is a reading
   * of that series, not an independent count of closures.
   */
  const volume = useMemo(() => {
    const points = trends?.data ?? [];
    if (points.length === 0) return null;
    const created = points.reduce((sum, p) => sum + p.created, 0);
    const resolved = points.reduce((sum, p) => sum + p.resolved, 0);
    const busiest = points.reduce((a, b) => (b.created > a.created ? b : a));
    return {
      created,
      resolved,
      net: created - resolved,
      perDay: created / points.length,
      busiestDate: busiest.created > 0 ? formatChartDate(busiest.date) : '–',
      // Capped at 100: a quiet week can resolve more tickets than it opened,
      // and a bar past its own track reads as a rendering fault.
      resolutionRate: Math.min(100, Math.round((resolved / Math.max(1, created)) * 100)),
    };
  }, [trends?.data]);

  /**
   * Busiest brands, from the stats endpoint's own per-brand breakdown. Its
   * `total` is already scoped to the selected window, so this is tickets
   * CREATED in the period and not an all-time tally.
   */
  const busiestBrands = useMemo(() => {
    const rows = Object.entries(stats?.byBrand ?? {})
      .map(([id, b]) => ({ id, name: b.name, total: b.total }))
      .filter((b) => b.total > 0)
      .sort((a, b) => b.total - a.total);
    return rows.slice(0, 7);
  }, [stats?.byBrand]);

  const maxBrandTotal = busiestBrands[0]?.total ?? 1;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground">
            Tickets across {brandName}, last {days} days.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Three fixed ranges read better as one control than as a dropdown:
              every option is visible, and switching is one click, not two. */}
          <div
            role="group"
            aria-label="Date range"
            className="inline-flex rounded-md border p-0.5"
          >
            {RANGES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                aria-pressed={days === n}
                className={cn(
                  'rounded-[5px] px-3 py-1 text-sm font-medium transition-colors',
                  days === n
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {n} days
              </button>
            ))}
          </div>
          <Select
            value={selectedBrands.length === 0 ? 'all' : selectedBrands[0]}
            onValueChange={(v) => setSelectedBrands(v === 'all' ? [] : [v])}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands?.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <StatusTabs
        className="mb-6"
        counts={{
          active: (stats?.open || 0) + (stats?.pending || 0),
          all: (stats?.open || 0) + (stats?.pending || 0) + (stats?.resolved || 0) + (stats?.closed || 0),
          open: stats?.open || 0,
          pending: stats?.pending || 0,
          resolved: stats?.resolved || 0,
          closed: stats?.closed || 0,
        }}
        loading={statsLoading}
      />

      {/* Response Metrics */}
      <div className="grid gap-4 mb-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. First Response</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatMinutes(stats?.responseMetrics?.avgFirstResponseMinutes ?? null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {statsLoading ? '...' : stats?.responseMetrics?.ticketsWithResponse || 0} tickets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatMinutes(stats?.responseMetrics?.avgResolutionMinutes ?? null)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {statsLoading ? '...' : stats?.responseMetrics?.ticketsResolved || 0} resolved tickets
            </p>
          </CardContent>
        </Card>
        {/* Whether the queue is growing is the one question the other two
            cards cannot answer: a fast team can still be losing ground. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Backlog Change</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold tabular-nums">
                {trendsLoading || !volume
                  ? '...'
                  : `${volume.net > 0 ? '+' : ''}${volume.net}`}
              </div>
              {volume && !trendsLoading && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    volume.net > 0 ? 'text-destructive' : 'text-success-foreground'
                  )}
                >
                  {volume.net > 0 ? 'Growing' : 'Shrinking'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {trendsLoading || !volume
                ? '...'
                : `${volume.resolved} resolved of ${volume.created} created (${volume.resolutionRate}%)`}
            </p>
            {volume && !trendsLoading && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="bg-success h-full rounded-full"
                  style={{ width: `${volume.resolutionRate}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Ticket Volume ({days} days)</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {volume && !trendsLoading && (
            <div className="mb-4 grid grid-cols-2 gap-4 border-b pb-4 sm:grid-cols-4">
              <VolumeStat value={String(volume.created)} label="Created" />
              <VolumeStat value={String(volume.resolved)} label="Resolved" />
              <VolumeStat value={volume.perDay.toFixed(1)} label="Created per day" />
              <VolumeStat value={volume.busiestDate} label="Busiest day" />
            </div>
          )}
          {trendsLoading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Loading trends...
            </div>
          ) : trends?.data && trends.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={trends.data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && label) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="text-xs text-muted-foreground mb-1">
                            {formatChartDate(String(label))}
                          </div>
                          <div className="grid gap-1">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="bg-info h-2 w-2 rounded-full" />
                              <span>Created: {payload[0]?.value}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="bg-success h-2 w-2 rounded-full" />
                              <span>Resolved: {payload[1]?.value}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No trend data available
            </div>
          )}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="bg-info h-2 w-2 rounded-full" />
              <span>Created</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-success h-2 w-2 rounded-full" />
              <span>Resolved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Only worth drawing when there is something to compare: one bar at
          full width tells you nothing you did not already know. */}
      {busiestBrands.length > 1 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-baseline justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Busiest brands</CardTitle>
            <span className="text-xs text-muted-foreground">Tickets created</span>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {busiestBrands.map((brand, i) => (
              <div key={brand.id} className="flex items-center gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[220px]">
                  <BrandTile
                    name={brand.name}
                    iconUrl={brands?.find((b) => b.id === brand.id)?.iconUrl}
                    size="sm"
                  />
                  <span className="truncate text-sm">{brand.name}</span>
                </span>
                <span className="hidden h-2 flex-1 overflow-hidden rounded-full bg-secondary sm:block">
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      i === 0 ? 'bg-primary' : 'bg-primary/40'
                    )}
                    style={{ width: `${Math.round((brand.total / maxBrandTotal) * 100)}%` }}
                  />
                </span>
                <span className="w-10 text-right text-sm tabular-nums">{brand.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
