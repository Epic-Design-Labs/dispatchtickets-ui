'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTicket, useComments, useUpdateTicket, useDeleteTicket, useMarkAsSpam, useUpdateCustomer, useTickets, useTicketNavigation, useTeamMembers } from '@/lib/hooks';
import { Header } from '@/components/layout';
import { StatusBadge, PriorityBadge } from '@/components/tickets';
import { CommentThread, CommentEditor } from '@/components/comments';
import { CompanyCombobox } from '@/components/companies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/ui/markdown-content';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { TicketStatus, TicketPriority } from '@/types';
import { Trash2, ShieldAlert, Building2, User, UserX } from 'lucide-react';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const ticketId = params.ticketId as string;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: ticket, isLoading: ticketLoading } = useTicket(brandId, ticketId);
  const { data: comments, isLoading: commentsLoading } = useComments(brandId, ticketId, { polling: true });
  const { data: ticketsData } = useTickets(brandId, { status: 'open', limit: 100 });
  const { data: teamData } = useTeamMembers();
  const updateTicket = useUpdateTicket(brandId, ticketId);
  const deleteTicket = useDeleteTicket(brandId);
  const markAsSpam = useMarkAsSpam(brandId);
  const updateCustomer = useUpdateCustomer(brandId, ticket?.customerId || '');

  // Get active team members for assignment
  const teamMembers = teamData?.members || [];

  // Find prev/next tickets for j/k navigation
  const { prevTicketId, nextTicketId, currentIndex, totalCount } = useMemo(() => {
    const tickets = ticketsData?.data || [];
    const idx = tickets.findIndex(t => t.id === ticketId);
    return {
      prevTicketId: idx > 0 ? tickets[idx - 1].id : null,
      nextTicketId: idx >= 0 && idx < tickets.length - 1 ? tickets[idx + 1].id : null,
      currentIndex: idx >= 0 ? idx + 1 : 0,
      totalCount: tickets.length,
    };
  }, [ticketsData, ticketId]);

  // Enable j/k keyboard navigation
  const { goToPrev, goToNext } = useTicketNavigation(prevTicketId, nextTicketId, brandId);

  // Navigate to next ticket, or prev, or back to list
  const navigateAfterAction = () => {
    if (nextTicketId) {
      router.push(`/brands/${brandId}/tickets/${nextTicketId}`);
    } else if (prevTicketId) {
      router.push(`/brands/${brandId}/tickets/${prevTicketId}`);
    } else {
      router.push(`/brands/${brandId}`);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateTicket.mutateAsync({ status: status as TicketStatus });
      toast.success('Status updated');
      // Auto-advance to next ticket when resolved/closed
      if (status === 'resolved' || status === 'closed') {
        navigateAfterAction();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (priority: string) => {
    try {
      await updateTicket.mutateAsync({ priority: priority as TicketPriority });
      toast.success('Priority updated');
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    try {
      // Use empty string to unassign, null for API
      await updateTicket.mutateAsync({
        assigneeId: assigneeId === '' ? null : assigneeId
      });
      toast.success(assigneeId ? 'Ticket assigned' : 'Ticket unassigned');
    } catch {
      toast.error('Failed to update assignee');
    }
  };

  // Get member display name
  const getMemberName = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return memberId;
    if (member.firstName || member.lastName) {
      return [member.firstName, member.lastName].filter(Boolean).join(' ');
    }
    return member.email;
  };

  const handleMarkAsSpam = async () => {
    try {
      await markAsSpam.mutateAsync({ ticketId, isSpam: true });
      toast.success('Marked as spam. Future emails from this sender will be auto-spammed.');
      navigateAfterAction();
    } catch {
      toast.error('Failed to mark as spam');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTicket.mutateAsync(ticketId);
      toast.success('Ticket deleted');
      navigateAfterAction();
    } catch {
      toast.error('Failed to delete ticket');
    }
  };

  const handleCompanyChange = async (companyId: string | undefined) => {
    if (!ticket?.customerId) return;
    try {
      await updateCustomer.mutateAsync({
        companyId: companyId,
      });
      toast.success('Customer company updated');
    } catch {
      toast.error('Failed to update company');
    }
  };

  if (ticketLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Ticket" />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-20" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col">
        <Header title="Ticket Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <p className="text-lg font-medium">Ticket not found</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const customerEmail = ticket.customFields?.requesterEmail as string | undefined;
  const customerName = ticket.customFields?.requesterName as string | undefined;

  return (
    <div className="flex flex-col">
      <Header title={ticket.title} />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/brands/${brandId}`}
              className="hover:underline"
            >
              Tickets
            </Link>
            <span>/</span>
            <span>{ticket.id.slice(0, 12)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">{ticket.title}</h2>
            <div className="flex items-center gap-2">
              {/* Prev/Next navigation */}
              {totalCount > 0 && (
                <div className="flex items-center gap-1 mr-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPrev}
                    disabled={!prevTicketId}
                    title="Previous ticket (⌘K)"
                    className="px-2"
                  >
                    <kbd className="text-xs font-mono">⌘K</kbd>
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                    {currentIndex} / {totalCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNext}
                    disabled={!nextTicketId}
                    title="Next ticket (⌘J)"
                    className="px-2"
                  >
                    <kbd className="text-xs font-mono">⌘J</kbd>
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsSpam}
                disabled={markAsSpam.isPending}
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Spam
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {ticket.body ? (
                  <MarkdownContent content={ticket.body} />
                ) : (
                  <p className="text-muted-foreground">No description provided</p>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CommentEditor brandId={brandId} ticketId={ticketId} />
                <Separator />
                <CommentThread
                  comments={comments || []}
                  isLoading={commentsLoading}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {ticket.status ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="mt-1 h-auto p-0">
                          <StatusBadge status={ticket.status} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Change status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={ticket.status}
                          onValueChange={handleStatusChange}
                        >
                          <DropdownMenuRadioItem value="open">Open</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="pending">
                            Pending
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="resolved">
                            Resolved
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <p className="mt-1 text-muted-foreground">Not set</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Priority</p>
                  {ticket.priority ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="mt-1 h-auto p-0">
                          <PriorityBadge priority={ticket.priority} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Change priority</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup
                          value={ticket.priority}
                          onValueChange={handlePriorityChange}
                        >
                          <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="normal">
                            Normal
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="urgent">
                            Urgent
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <p className="mt-1 text-muted-foreground">Not set</p>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Source</p>
                  <p className="mt-1">{ticket.source}</p>
                </div>

                {/* Customer Info */}
                {ticket.customer ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Customer</p>
                      <Link
                        href={`/brands/${brandId}/customers/${ticket.customer.id}`}
                        className="mt-1 block text-primary hover:underline"
                      >
                        {ticket.customer.name || ticket.customer.email}
                      </Link>
                      {ticket.customer.name && (
                        <p className="text-sm text-muted-foreground">{ticket.customer.email}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Company
                      </p>
                      <div className="mt-1">
                        <CompanyCombobox
                          brandId={brandId}
                          value={ticket.customer.companyId}
                          companyName={ticket.customer.company?.name}
                          onChange={handleCompanyChange}
                          disabled={updateCustomer.isPending}
                          placeholder="Search or create company..."
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {customerEmail && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Customer Email
                        </p>
                        <p className="mt-1">{customerEmail}</p>
                      </div>
                    )}

                    {customerName && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Customer Name
                        </p>
                        <p className="mt-1">{customerName}</p>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assignee</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="mt-1 h-auto p-0">
                        {ticket.assigneeId ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <User className="h-3.5 w-3.5" />
                            {getMemberName(ticket.assigneeId)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <UserX className="h-3.5 w-3.5" />
                            Unassigned
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={ticket.assigneeId || ''}
                        onValueChange={handleAssigneeChange}
                      >
                        <DropdownMenuRadioItem value="">
                          <span className="flex items-center gap-1.5">
                            <UserX className="h-3.5 w-3.5" />
                            Unassigned
                          </span>
                        </DropdownMenuRadioItem>
                        {teamMembers.map((member) => (
                          <DropdownMenuRadioItem key={member.id} value={member.id}>
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              {member.firstName || member.lastName
                                ? [member.firstName, member.lastName].filter(Boolean).join(' ')
                                : member.email}
                            </span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="mt-1">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Updated</p>
                  <p className="mt-1">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone and will permanently remove the ticket along with all its comments and attachments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
