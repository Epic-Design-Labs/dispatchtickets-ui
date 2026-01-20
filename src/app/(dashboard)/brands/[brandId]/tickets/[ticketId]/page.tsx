'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTicket, useComments, useUpdateTicket, useDeleteTicket, useMarkAsSpam, useUpdateCustomer, useTickets, useTicketNavigation, useTeamMembers, useCustomerTickets, useMergeTickets, useCategories, useTags, useCreateTag, useBrand, useFieldsByEntity, useAcknowledgeMentionsOnView } from '@/lib/hooks';
import { useStatuses } from '@/lib/hooks/use-statuses';
import { StatusBadge, PriorityBadge, TicketHistory, CloseTicketDialog, TicketWatchers } from '@/components/tickets';
import { CommentThread, CommentEditor } from '@/components/comments';
import { CompanyCombobox } from '@/components/companies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
import { TicketStatus, TicketPriority, CloseReason, CLOSE_REASONS } from '@/types';
import { Trash2, Building2, User, UserX, Ticket, Merge, FolderOpen, Tag, X, Plus, History, Layers, Pencil, Check, Clock, MessageSquare, MoreHorizontal, ChevronDown } from 'lucide-react';
import { CustomFieldInput } from '@/components/fields';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const ticketId = params.ticketId as string;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionValue, setEditDescriptionValue] = useState('');

  const { data: brand } = useBrand(brandId);
  const { data: ticket, isLoading: ticketLoading } = useTicket(brandId, ticketId, { polling: true });
  const { data: comments, isLoading: commentsLoading } = useComments(brandId, ticketId, { polling: true });
  const { data: ticketsData } = useTickets(brandId, { status: 'open', limit: 100 });
  const { data: teamData } = useTeamMembers({ brandId });
  const updateTicket = useUpdateTicket(brandId, ticketId);
  const deleteTicket = useDeleteTicket(brandId);
  const markAsSpam = useMarkAsSpam(brandId);
  const updateCustomer = useUpdateCustomer(brandId, ticket?.customerId || '');
  const mergeTickets = useMergeTickets(brandId);
  const { data: customerTicketsData, isLoading: customerTicketsLoading } = useCustomerTickets(
    brandId,
    ticket?.customerId,
    ticketId
  );
  const otherTickets = customerTicketsData?.data || [];

  // Categories, tags, and statuses
  const { data: categories } = useCategories(brandId);
  const { data: tags } = useTags(brandId);
  const createTag = useCreateTag(brandId);
  const { data: statuses } = useStatuses(brandId);

  // Custom fields
  const { data: ticketFields } = useFieldsByEntity(brandId, 'ticket');

  // Auto-acknowledge any mentions for this ticket when viewing
  useAcknowledgeMentionsOnView(ticketId);

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
    // If closing, open the dialog to select a reason
    if (status === 'closed') {
      setShowCloseDialog(true);
      return;
    }
    try {
      await updateTicket.mutateAsync({ status: status as TicketStatus });
      toast.success('Status updated');
      // Auto-advance to next ticket when resolved
      if (status === 'resolved') {
        navigateAfterAction();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleCloseWithReason = async (reason: CloseReason) => {
    try {
      await updateTicket.mutateAsync({ status: 'closed', closeReason: reason });
      toast.success('Ticket closed');
      setShowCloseDialog(false);
      navigateAfterAction();
    } catch {
      toast.error('Failed to close ticket');
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

  const handleCategoryChange = async (categoryId: string) => {
    try {
      await updateTicket.mutateAsync({
        categoryId: categoryId === '' ? null : categoryId
      });
      toast.success(categoryId ? 'Category updated' : 'Category removed');
    } catch {
      toast.error('Failed to update category');
    }
  };

  const handleAddTag = async (tagName: string) => {
    if (!ticket) return;
    const currentTags = ticket.tags?.map(t => t.name) || [];
    if (currentTags.includes(tagName)) return;
    try {
      await updateTicket.mutateAsync({
        tags: [...currentTags, tagName]
      });
      toast.success('Tag added');
      setTagPopoverOpen(false);
      setTagInputValue('');
    } catch {
      toast.error('Failed to add tag');
    }
  };

  const handleCreateAndAddTag = async (tagName: string) => {
    if (!ticket || !tagName.trim()) return;
    const trimmedName = tagName.trim();
    const currentTags = ticket.tags?.map(t => t.name) || [];
    if (currentTags.includes(trimmedName)) {
      toast.error('Tag already added to this ticket');
      return;
    }
    // Check if tag already exists (case-insensitive)
    const existingTag = tags?.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingTag) {
      // Just add the existing tag
      await handleAddTag(existingTag.name);
      return;
    }
    try {
      // Create the new tag first
      await createTag.mutateAsync({ name: trimmedName });
      // Then add it to the ticket
      await updateTicket.mutateAsync({
        tags: [...currentTags, trimmedName]
      });
      toast.success('Tag created and added');
      setTagPopoverOpen(false);
      setTagInputValue('');
    } catch {
      toast.error('Failed to create tag');
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!ticket) return;
    const currentTags = ticket.tags?.map(t => t.name) || [];
    try {
      await updateTicket.mutateAsync({
        tags: currentTags.filter(t => t !== tagName)
      });
      toast.success('Tag removed');
    } catch {
      toast.error('Failed to remove tag');
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

  // Get member display name and initials
  const getMemberName = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return memberId;
    if (member.firstName || member.lastName) {
      return [member.firstName, member.lastName].filter(Boolean).join(' ');
    }
    return member.email;
  };

  const getMemberInitials = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return '?';
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
    }
    if (member.firstName) return member.firstName[0].toUpperCase();
    if (member.email) return member.email[0].toUpperCase();
    return '?';
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

  const handleStartEditTitle = () => {
    setEditTitleValue(ticket?.title || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    try {
      await updateTicket.mutateAsync({ title: editTitleValue.trim() });
      toast.success('Title updated');
      setIsEditingTitle(false);
    } catch {
      toast.error('Failed to update title');
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
  };

  const handleStartEditDescription = () => {
    setEditDescriptionValue(ticket?.body || '');
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    try {
      await updateTicket.mutateAsync({ body: editDescriptionValue });
      toast.success('Description updated');
      setIsEditingDescription(false);
    } catch {
      toast.error('Failed to update description');
    }
  };

  const handleCancelEditDescription = () => {
    setIsEditingDescription(false);
    setEditDescriptionValue('');
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

  const handleCustomFieldChange = async (key: string, value: unknown) => {
    if (!ticket) return;
    try {
      const currentCustomFields = ticket.customFields || {};
      await updateTicket.mutateAsync({
        customFields: {
          ...currentCustomFields,
          [key]: value,
        },
      });
      toast.success('Field updated');
    } catch {
      toast.error('Failed to update field');
    }
  };

  const toggleMergeSelection = (ticketId: string) => {
    setSelectedForMerge((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleMerge = async () => {
    if (selectedForMerge.length === 0) return;
    try {
      const result = await mergeTickets.mutateAsync({
        targetTicketId: ticketId,
        sourceTicketIds: selectedForMerge,
      });
      toast.success(`Merged ${result.mergedCount} ticket(s) into this ticket`);
      setSelectedForMerge([]);
      setShowMergeDialog(false);
    } catch {
      toast.error('Failed to merge tickets');
    }
  };

  // Enable keyboard shortcuts for navigation and actions
  const { goToPrev, goToNext } = useTicketNavigation(prevTicketId, nextTicketId, brandId, {
    onSpam: handleMarkAsSpam,
    onDelete: () => setShowDeleteDialog(true),
    onResolve: () => handleStatusChange('resolved'),
    onPending: () => handleStatusChange('pending'),
  });

  // Calculate ticket age
  const getTicketAge = () => {
    if (!ticket) return '-';
    const created = new Date(ticket.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    const diffMins = Math.floor(diffMs / (1000 * 60)) % 60;
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  // Calculate last activity time
  const getLastActivity = () => {
    if (!ticket) return '-';
    const updated = new Date(ticket.updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (ticketLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-14 items-center justify-between border-b bg-gray-100 px-6">
          <Skeleton className="h-4 w-48" />
        </header>
        <div className="flex flex-1">
          <div className="flex-1 bg-white p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="w-80 bg-gray-50 p-6">
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-full mb-4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-14 items-center border-b bg-gray-100 px-6">
          <span className="text-sm text-muted-foreground">Ticket Not Found</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <p className="text-lg font-medium">Ticket not found</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar - Grey background */}
      <header className="flex h-14 items-center justify-between border-b bg-gray-100 px-6">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/brands/${brandId}`}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {brand?.name || 'Brand'} Tickets
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">#{ticket.id.slice(0, 12)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="History"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            title="Delete ticket"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup>
                <DropdownMenuRadioItem value="spam" onClick={handleMarkAsSpam}>
                  Mark as spam
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Title bar - White background */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 max-w-2xl">
              <Input
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelEditTitle();
                }}
                className="text-2xl font-bold h-auto py-1"
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={handleSaveTitle} disabled={updateTicket.isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelEditTitle}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <h1
                className="text-2xl font-bold tracking-tight cursor-pointer hover:bg-muted/50 px-2 py-1 -mx-2 rounded group flex items-center gap-2 inline-flex"
                onClick={handleStartEditTitle}
                title="Click to edit title"
              >
                {ticket.title}
                <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-50" />
              </h1>
              <div className="flex items-center gap-2 mt-2">
                {/* Priority badge - clickable */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hover:opacity-80 transition-opacity">
                      <PriorityBadge priority={ticket.priority || 'normal'} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Change priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={ticket.priority || 'normal'} onValueChange={handlePriorityChange}>
                      <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="normal">Normal</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="urgent">Urgent</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Time badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{getTicketAge()}</span>
                  <span>•</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Source indicator */}
                {ticket.source && ticket.source !== 'api' && (
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium capitalize">
                    {ticket.source}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right side: Navigation + Status dropdown */}
        <div className="flex items-center gap-4">
          {/* Prev/Next navigation */}
          {totalCount > 0 && (
            <div className="flex items-center border rounded-lg bg-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrev}
                disabled={!prevTicketId}
                title="Previous ticket (K)"
                className="px-3 rounded-r-none border-r"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                {currentIndex} / {totalCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                disabled={!nextTicketId}
                title="Next ticket (J)"
                className="px-3 rounded-l-none border-l"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          )}

          {/* Status dropdown - Colored pill style */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {(() => {
                // Get status info - prioritize lookup by key (ticket.status) over embedded statusRef
                // because statusRef may be stale after status updates
                const statusKey = ticket.status || 'open';
                const statusFromList = statuses?.find(s => s.key === statusKey);
                const defaultColors: Record<string, string> = {
                  open: '#3b82f6',
                  pending: '#f59e0b',
                  resolved: '#22c55e',
                  closed: '#22c55e',
                };
                // Prioritize statusFromList (based on current ticket.status) over potentially stale statusRef
                const statusColor = statusFromList?.color || ticket.statusRef?.color || defaultColors[statusKey] || '#3b82f6';
                const statusName = statusFromList?.name || ticket.statusRef?.name || (statusKey.charAt(0).toUpperCase() + statusKey.slice(1));

                return (
                  <Button
                    className="text-white rounded-full px-4 hover:opacity-90"
                    size="sm"
                    style={{ backgroundColor: statusColor }}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    {statusName}
                    <ChevronDown className="h-4 w-4 ml-1.5" />
                  </Button>
                );
              })()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={ticket.status || 'open'} onValueChange={handleStatusChange}>
                {statuses?.map((s) => (
                  <DropdownMenuRadioItem key={s.id} value={s.key}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
                {!statuses?.length && (
                  <>
                    <DropdownMenuRadioItem value="open">Open</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="pending">Pending</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="resolved">Resolved</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="closed">Closed</DropdownMenuRadioItem>
                  </>
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content area - Two columns */}
      <div className="flex flex-1">
        {/* Left column - White background */}
        <div className="flex-1 bg-white p-6 space-y-6 overflow-auto">
          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Description</CardTitle>
                {!isEditingDescription ? (
                  <Button variant="ghost" size="sm" onClick={handleStartEditDescription}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={handleCancelEditDescription}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSaveDescription} disabled={updateTicket.isPending}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingDescription ? (
                <textarea
                  value={editDescriptionValue}
                  onChange={(e) => setEditDescriptionValue(e.target.value)}
                  placeholder="Enter description..."
                  className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  autoFocus
                />
              ) : ticket.body ? (
                <MarkdownContent content={ticket.body} showSourceToggle />
              ) : (
                <p className="text-muted-foreground">No description provided</p>
              )}
            </CardContent>
          </Card>

          {/* Activity / Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CommentEditor brandId={brandId} ticketId={ticketId} />
              <Separator />
              <CommentThread comments={comments || []} isLoading={commentsLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar - Grey background */}
        <div className="w-80 bg-gray-50 border-l p-6 space-y-6 overflow-auto">
          {/* Customer Section */}
          {ticket.customer && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Customer
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-medium">
                  {ticket.customer.name?.[0]?.toUpperCase() || ticket.customer.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/brands/${brandId}/customers/${ticket.customer.id}`}
                    className="font-medium hover:underline block truncate"
                  >
                    {ticket.customer.name || 'Unknown'}
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">{ticket.customer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Company:</span>
                <CompanyCombobox
                  brandId={brandId}
                  value={ticket.customer.companyId}
                  companyName={ticket.customer.company?.name}
                  onChange={handleCompanyChange}
                  disabled={updateCustomer.isPending}
                  placeholder="Set company..."
                  variant="inline"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Assignee Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Assignee
            </div>
            {ticket.assigneeId ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  {getMemberInitials(ticket.assigneeId)}
                </div>
                <span className="text-sm">{getMemberName(ticket.assigneeId)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserX className="h-5 w-5" />
                <span className="text-sm">Unassigned</span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="link" size="sm" className="h-auto p-0 text-sm">
                  Change assignee
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={ticket.assigneeId || ''} onValueChange={handleAssigneeChange}>
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

          {/* Watchers Section */}
          <TicketWatchers brandId={brandId} ticketId={ticketId} />

          <Separator />

          {/* Activity Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Activity Status
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">Last update: {getLastActivity()}</span>
            </div>
          </div>

          <Separator />

          {/* Time Tracking */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Time Tracking
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  First Response
                </span>
                <span className="text-emerald-600 font-medium">-</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Ticket Age
                </span>
                <span className="font-medium">{getTicketAge()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Details Section */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Details</div>

            {/* Category */}
            {categories && categories.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Category
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-auto py-0.5 px-1.5">
                      {ticket.category ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: ticket.category.color || '#6366f1' }}
                          />
                          {ticket.category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Set category</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={ticket.categoryId || ''} onValueChange={handleCategoryChange}>
                      <DropdownMenuRadioItem value="">
                        <span className="text-muted-foreground">No category</span>
                      </DropdownMenuRadioItem>
                      {categories.map((cat) => (
                        <DropdownMenuRadioItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: cat.color || '#6366f1' }}
                            />
                            {cat.name}
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Tags */}
            {tags && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1 pt-0.5">
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                </span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {ticket.tags && ticket.tags.length > 0 ? (
                    ticket.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: tag.color ? `${tag.color}20` : '#6366f120',
                          color: tag.color || '#6366f1',
                        }}
                      >
                        {tag.name}
                        <button onClick={() => handleRemoveTag(tag.name)} className="hover:opacity-70">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))
                  ) : null}
                  <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="end">
                      <Command>
                        <CommandInput
                          placeholder="Search or create tag..."
                          value={tagInputValue}
                          onValueChange={setTagInputValue}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && tagInputValue.trim()) {
                              e.preventDefault();
                              handleCreateAndAddTag(tagInputValue);
                            }
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {tagInputValue.trim() ? (
                              <button
                                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
                                onClick={() => handleCreateAndAddTag(tagInputValue)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Create &quot;{tagInputValue.trim()}&quot;
                              </button>
                            ) : (
                              <span className="text-muted-foreground">No tags found</span>
                            )}
                          </CommandEmpty>
                          <CommandGroup>
                            {tags
                              .filter(t => !ticket.tags?.some(tt => tt.id === t.id))
                              .map((tag) => (
                                <CommandItem key={tag.id} value={tag.name} onSelect={() => handleAddTag(tag.name)}>
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: tag.color || '#6366f1' }}
                                  />
                                  {tag.name}
                                </CommandItem>
                              ))}
                            {tagInputValue.trim() &&
                              !tags.some(t => t.name.toLowerCase() === tagInputValue.trim().toLowerCase()) && (
                                <CommandItem
                                  value={`create-${tagInputValue}`}
                                  onSelect={() => handleCreateAndAddTag(tagInputValue)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Create &quot;{tagInputValue.trim()}&quot;
                                </CommandItem>
                              )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Updated</span>
              <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
            </div>

            {ticket.status === 'closed' && ticket.closeReason && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Close reason</span>
                  <span>{CLOSE_REASONS.find(r => r.value === ticket.closeReason)?.label || ticket.closeReason}</span>
                </div>
              </>
            )}
          </div>

          {/* Custom Fields */}
          {ticketFields && ticketFields.filter(f => f.visible).length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  Custom Fields
                </div>
                <div className="space-y-4">
                  {ticketFields
                    .filter(f => f.visible)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((field) => {
                      const customFields = ticket.customFields as Record<string, unknown> || {};
                      return (
                        <CustomFieldInput
                          key={field.key}
                          field={field}
                          value={customFields[field.key]}
                          onChange={(value) => handleCustomFieldChange(field.key, value)}
                        />
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* Other tickets from this customer */}
          {ticket.customer && otherTickets.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Ticket className="h-4 w-4" />
                    Other Tickets
                  </div>
                  {selectedForMerge.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowMergeDialog(true)}
                      className="h-7 text-xs"
                    >
                      <Merge className="h-3 w-3 mr-1" />
                      Merge ({selectedForMerge.length})
                    </Button>
                  )}
                </div>
                {customerTicketsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {otherTickets.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-start gap-2 p-2 -mx-2 rounded hover:bg-gray-100 transition-colors"
                      >
                        <Checkbox
                          checked={selectedForMerge.includes(t.id)}
                          onCheckedChange={() => toggleMergeSelection(t.id)}
                          className="mt-1"
                        />
                        <Link href={`/brands/${brandId}/tickets/${t.id}`} className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <StatusBadge status={t.status || 'open'} statusRef={t.statusRef} className="mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{t.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                    {customerTicketsData?.pagination?.hasMore && (
                      <Link
                        href={`/brands/${brandId}/customers/${ticket.customer.id}`}
                        className="block text-xs text-primary hover:underline pt-1"
                      >
                        View all tickets →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Ticket History */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="h-4 w-4" />
              History
            </div>
            <TicketHistory brandId={brandId} ticketId={ticketId} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
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

      <AlertDialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Tickets</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to merge {selectedForMerge.length} ticket(s) into this ticket?
              <br /><br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Move all comments and attachments to this ticket</li>
                <li>Close the merged tickets with a reference note</li>
                <li>Add merge history to this ticket</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} disabled={mergeTickets.isPending}>
              {mergeTickets.isPending ? 'Merging...' : 'Merge Tickets'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CloseTicketDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        ticketCount={1}
        onConfirm={handleCloseWithReason}
        isProcessing={updateTicket.isPending}
      />
    </div>
  );
}
