'use client';

import { useState } from 'react';
import { useDashboardStats, useDashboardTrends, useBrands } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, MessageCircle } from 'lucide-react';
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

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Statistics</h1>
        <div className="flex gap-3">
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
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
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-violet-500 text-white">
          <span className="h-2 w-2 rounded-full bg-blue-300" />
          <span>Active</span>
          <span className="font-bold text-lg ml-2">
            {statsLoading ? '...' : (stats?.open || 0) + (stats?.pending || 0)}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span>All</span>
          <span className="font-bold text-lg ml-2">
            {statsLoading ? '...' : (stats?.open || 0) + (stats?.pending || 0) + (stats?.resolved || 0) + (stats?.closed || 0)}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Open</span>
          <span className="font-bold text-lg ml-2">
            {statsLoading ? '...' : stats?.open || 0}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Pending</span>
          <span className="font-bold text-lg ml-2">
            {statsLoading ? '...' : stats?.pending || 0}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Resolved</span>
          <span className="font-bold text-lg ml-2">
            {statsLoading ? '...' : stats?.resolved || 0}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          <span>Closed</span>
          <span className="font-bold text-lg ml-2">
            {statsLoading ? '...' : stats?.closed || 0}
          </span>
        </div>
      </div>

      {/* Response Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
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
      </div>

      {/* Trends Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Ticket Volume ({days} days)</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
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
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              <span>Created: {payload[0]?.value}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
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
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Created</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Resolved</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
