'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTicket, useComments, useUpdateTicket, useDeleteTicket, useMarkAsSpam, useCompanies, useUpdateCustomer } from '@/lib/hooks';
import { Header } from '@/components/layout';
import { StatusBadge, PriorityBadge } from '@/components/tickets';
import { CommentThread, CommentEditor } from '@/components/comments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { MoreHorizontal, Trash2, ShieldAlert, Building2 } from 'lucide-react';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const ticketId = params.ticketId as string;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: ticket, isLoading: ticketLoading } = useTicket(workspaceId, ticketId);
  const { data: comments, isLoading: commentsLoading } = useComments(workspaceId, ticketId, { polling: true });
  const { data: companiesData } = useCompanies(workspaceId);
  const updateTicket = useUpdateTicket(workspaceId, ticketId);
  const deleteTicket = useDeleteTicket(workspaceId);
  const markAsSpam = useMarkAsSpam(workspaceId);
  const updateCustomer = useUpdateCustomer(workspaceId, ticket?.customerId || '');

  const companies = companiesData?.data || [];

  const handleStatusChange = async (status: string) => {
    try {
      await updateTicket.mutateAsync({ status: status as TicketStatus });
      toast.success('Status updated');
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

  const handleMarkAsSpam = async () => {
    try {
      await markAsSpam.mutateAsync({ ticketId, isSpam: true });
      toast.success('Ticket marked as spam. Future emails from this sender will be auto-spammed.');
      router.push(`/brands/${workspaceId}`);
    } catch {
      toast.error('Failed to mark as spam');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTicket.mutateAsync(ticketId);
      toast.success('Ticket deleted');
      router.push(`/brands/${workspaceId}`);
    } catch {
      toast.error('Failed to delete ticket');
    }
  };

  const handleCompanyChange = async (companyId: string) => {
    if (!ticket?.customerId) return;
    try {
      await updateCustomer.mutateAsync({
        companyId: companyId === 'none' ? undefined : companyId,
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
              href={`/brands/${workspaceId}`}
              className="hover:underline"
            >
              Tickets
            </Link>
            <span>/</span>
            <span>{ticket.id.slice(0, 12)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">{ticket.title}</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleMarkAsSpam}
                  disabled={markAsSpam.isPending}
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Mark as Spam
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Ticket
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  <p className="whitespace-pre-wrap">{ticket.body}</p>
                ) : (
                  <p className="text-muted-foreground">No description provided</p>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CommentThread
                  comments={comments || []}
                  isLoading={commentsLoading}
                />
                <Separator />
                <CommentEditor workspaceId={workspaceId} ticketId={ticketId} />
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
                        href={`/brands/${workspaceId}/customers/${ticket.customer.id}`}
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
                      <Select
                        value={ticket.customer.companyId || 'none'}
                        onValueChange={handleCompanyChange}
                        disabled={updateCustomer.isPending}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No company</SelectItem>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                {ticket.assigneeId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Assignee
                    </p>
                    <p className="mt-1">{ticket.assigneeId}</p>
                  </div>
                )}

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
