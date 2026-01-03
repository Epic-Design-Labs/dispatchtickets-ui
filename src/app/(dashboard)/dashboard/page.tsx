'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboardTickets, useDashboardStats, useBrands } from '@/lib/hooks';
import { DashboardTicketFilters } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Inbox,
  User,
  AlertCircle,
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type ViewType = 'all' | 'mine' | 'unassigned';

function formatTimeAgo(date: string) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

function getStatusColor(status: string | null) {
  switch (status) {
    case 'open':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'resolved':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'closed':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}

function getPriorityColor(priority: string | null) {
  switch (priority) {
    case 'urgent':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL params
  const view = (searchParams.get('view') || 'all') as ViewType;
  const status = searchParams.get('status') || undefined;
  const brandsParam = searchParams.get('brands');
  const selectedBrands = brandsParam ? brandsParam.split(',').filter(Boolean) : [];

  // Build filters
  const filters: DashboardTicketFilters = useMemo(() => ({
    status: status || (view === 'all' ? 'open' : undefined),
    workspaceIds: selectedBrands.length > 0 ? selectedBrands : undefined,
    // TODO: Add assigneeId filter for "mine" view once we have current user ID
    // assigneeId: view === 'mine' ? currentUserId : undefined,
    // For unassigned, we'd need to filter where assigneeId is null
    limit: 50,
  }), [status, selectedBrands, view]);

  const { data: ticketsData, isLoading: ticketsLoading } = useDashboardTickets(filters);
  const { data: stats, isLoading: statsLoading } = useDashboardStats(selectedBrands);
  const { data: brands } = useBrands();

  // Navigation helpers
  const updateUrl = (params: Record<string, string | undefined>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    router.push(`/dashboard?${current.toString()}`);
  };

  const toggleBrand = (workspaceId: string) => {
    let newBrands: string[];
    if (selectedBrands.includes(workspaceId)) {
      newBrands = selectedBrands.filter((id) => id !== workspaceId);
    } else {
      newBrands = [...selectedBrands, workspaceId];
    }
    updateUrl({ brands: newBrands.length > 0 ? newBrands.join(',') : undefined });
  };

  const tickets = ticketsData?.data || [];

  return (
    <div className="flex h-full">
      {/* Queue Sidebar */}
      <aside className="w-56 border-r bg-muted/30 p-4 overflow-auto flex-shrink-0">
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Views
        </h3>
        <nav className="space-y-1 mb-6">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
              view === 'all'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Inbox className="h-4 w-4" />
            All Open
            {stats && (
              <span className="ml-auto text-xs opacity-70">{stats.open}</span>
            )}
          </Link>
          <Link
            href="/dashboard?view=mine"
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
              view === 'mine'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <User className="h-4 w-4" />
            My Tickets
          </Link>
          <Link
            href="/dashboard?view=unassigned"
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
              view === 'unassigned'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <AlertCircle className="h-4 w-4" />
            Unassigned
          </Link>
        </nav>

        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Brands
        </h3>
        <div className="space-y-2">
          {brands?.map((brand) => (
            <label
              key={brand.id}
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-md"
            >
              <Checkbox
                checked={selectedBrands.includes(brand.id)}
                onCheckedChange={() => toggleBrand(brand.id)}
              />
              <span className="truncate">{brand.name}</span>
              {stats?.byWorkspace[brand.id] && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {stats.byWorkspace[brand.id].open}
                </span>
              )}
            </label>
          ))}
          {(!brands || brands.length === 0) && (
            <p className="text-sm text-muted-foreground px-3">No brands yet</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <Ticket className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.open || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.pending || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.resolved || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
              <XCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.closed || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Brand</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[180px]">Customer</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Priority</TableHead>
                <TableHead className="w-[120px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">Loading tickets...</div>
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">No tickets found</div>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      router.push(`/brands/${ticket.workspaceId}/${ticket.id}`)
                    }
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-mono text-xs"
                      >
                        {ticket.workspace.ticketPrefix}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium truncate max-w-[400px]">
                        {ticket.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm truncate">
                        {String(
                          (ticket.customFields as Record<string, unknown>)?.requesterName ||
                          (ticket.customFields as Record<string, unknown>)?.requesterEmail ||
                          'Unknown'
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize text-xs',
                          getStatusColor(ticket.status)
                        )}
                      >
                        {ticket.status || 'open'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm capitalize',
                          getPriorityColor(ticket.priority)
                        )}
                      >
                        {ticket.priority || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(ticket.createdAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Load More */}
        {ticketsData?.pagination?.hasMore && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              Load More
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
