'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useBrand, useTickets } from '@/lib/hooks';
import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function BrandDashboardPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { data: brand, isLoading: brandLoading } = useBrand(workspaceId);
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(workspaceId);

  const isLoading = brandLoading || ticketsLoading;

  // Calculate ticket stats
  const tickets = ticketsData?.data || [];
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  };

  return (
    <div className="flex flex-col">
      <Header title={brand?.name || 'Dashboard'} />
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Overview of your brand activity
            </p>
          </div>
          <Button asChild>
            <Link href={`/workspaces/${workspaceId}/tickets`}>View All Tickets</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open</CardTitle>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.open}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.resolved}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Tickets */}
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-semibold">Recent Tickets</h3>
              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">No tickets yet</p>
                    <Button className="mt-4" asChild>
                      <Link href={`/workspaces/${workspaceId}/tickets?new=true`}>
                        Create your first ticket
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {tickets.slice(0, 5).map((ticket) => {
                    const customerEmail = ticket.customFields?.requesterEmail as string | undefined;
                    return (
                      <Link
                        key={ticket.id}
                        href={`/workspaces/${workspaceId}/tickets/${ticket.id}`}
                      >
                        <Card className="cursor-pointer transition-colors hover:bg-accent">
                          <CardContent className="flex items-center justify-between p-4">
                            <div className="flex-1">
                              <p className="font-medium">{ticket.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {customerEmail || 'No customer email'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                                {ticket.status || 'No status'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(ticket.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
