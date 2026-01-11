'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { Ticket, TeamMember } from '@/types';
import { Category } from '@/lib/api/categories';
import { Tag } from '@/lib/api/tags';
import { BulkActionType } from '@/lib/hooks/use-tickets';
import { Ban, CheckCircle, Clock, Trash2, X, Merge, UserPlus, FolderOpen, Tags, ChevronDown, UserMinus, ArrowUpDown, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';

// Column definitions
type ColumnKey = 'subject' | 'status' | 'priority' | 'customer' | 'assignee' | 'category' | 'created' | 'updated';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'subject', label: 'Subject', defaultVisible: true, sortable: true },
  { key: 'status', label: 'Status', defaultVisible: true, sortable: true },
  { key: 'priority', label: 'Priority', defaultVisible: true, sortable: true },
  { key: 'customer', label: 'Customer', defaultVisible: true, sortable: true },
  { key: 'assignee', label: 'Assignee', defaultVisible: false, sortable: true },
  { key: 'category', label: 'Category', defaultVisible: false, sortable: true },
  { key: 'created', label: 'Created', defaultVisible: true, sortable: true },
  { key: 'updated', label: 'Updated', defaultVisible: false, sortable: true },
];

const STORAGE_KEY = 'dispatch-ticket-columns';
const SORT_STORAGE_KEY = 'dispatch-ticket-sort';

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: ColumnKey | null;
  direction: SortDirection;
}

interface BulkActionOptions {
  assigneeId?: string | null;
  categoryId?: string | null;
  tags?: string[];
}

interface TicketTableProps {
  tickets: Ticket[];
  brandId: string;
  isLoading?: boolean;
  renderActions?: (ticket: Ticket) => React.ReactNode;
  onBulkAction?: (action: BulkActionType, ticketIds: string[], options?: BulkActionOptions) => Promise<void>;
  onMerge?: (targetTicketId: string, sourceTicketIds: string[]) => Promise<void>;
  teamMembers?: TeamMember[];
  categories?: Category[];
  tags?: Tag[];
}

export function TicketTable({
  tickets,
  brandId,
  isLoading,
  renderActions,
  onBulkAction,
  onMerge,
  teamMembers = [],
  categories = [],
  tags: availableTags = [],
}: TicketTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    if (typeof window === 'undefined') {
      return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return new Set(JSON.parse(stored) as ColumnKey[]);
      } catch {
        return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
      }
    }
    return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
  });

  // Sort state
  const [sortState, setSortState] = useState<SortState>(() => {
    if (typeof window === 'undefined') {
      return { column: null, direction: null };
    }
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as SortState;
      } catch {
        return { column: null, direction: null };
      }
    }
    return { column: null, direction: null };
  });

  // New bulk action dialogs state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);

  // Persist column visibility
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)));
  }, [visibleColumns]);

  // Persist sort state
  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortState));
  }, [sortState]);

  const toggleColumn = useCallback((key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback((column: ColumnKey) => {
    setSortState(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  }, []);

  // Sort tickets
  const sortedTickets = useMemo(() => {
    if (!sortState.column || !sortState.direction) {
      return tickets;
    }

    return [...tickets].sort((a, b) => {
      const column = sortState.column!;
      const direction = sortState.direction === 'asc' ? 1 : -1;

      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (column) {
        case 'subject':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 99;
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 99;
          break;
        case 'customer':
          aVal = (a.customer?.name || a.customer?.email || '').toLowerCase();
          bVal = (b.customer?.name || b.customer?.email || '').toLowerCase();
          break;
        case 'assignee':
          aVal = a.assigneeId || '';
          bVal = b.assigneeId || '';
          break;
        case 'category':
          aVal = a.category?.name?.toLowerCase() || '';
          bVal = b.category?.name?.toLowerCase() || '';
          break;
        case 'created':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'updated':
          aVal = new Date(a.updatedAt).getTime();
          bVal = new Date(b.updatedAt).getTime();
          break;
      }

      if (aVal === null || bVal === null) return 0;
      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
  }, [tickets, sortState]);

  const allSelected = tickets.length > 0 && selectedIds.size === tickets.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < tickets.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map(t => t.id)));
    }
  }, [allSelected, tickets]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(async (action: BulkActionType, options?: BulkActionOptions) => {
    if (!onBulkAction || selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      await onBulkAction(action, Array.from(selectedIds), options);
      setSelectedIds(new Set());
    } finally {
      setIsProcessing(false);
    }
  }, [onBulkAction, selectedIds]);

  const handleAssign = useCallback(async () => {
    const assigneeId = selectedAssigneeId === '' ? null : selectedAssigneeId;
    await handleBulkAction('assign', { assigneeId });
    setShowAssignDialog(false);
    setSelectedAssigneeId('');
  }, [handleBulkAction, selectedAssigneeId]);

  const handleSetCategory = useCallback(async () => {
    const categoryId = selectedCategoryId === '' ? null : selectedCategoryId;
    await handleBulkAction('setCategory', { categoryId });
    setShowCategoryDialog(false);
    setSelectedCategoryId('');
  }, [handleBulkAction, selectedCategoryId]);

  const handleSetTags = useCallback(async () => {
    await handleBulkAction('setTags', { tags: selectedTagNames });
    setShowTagsDialog(false);
    setSelectedTagNames([]);
  }, [handleBulkAction, selectedTagNames]);

  const toggleTagSelection = useCallback((tagName: string) => {
    setSelectedTagNames(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleMerge = useCallback(async () => {
    if (!onMerge || !mergeTargetId || selectedIds.size < 2) return;
    setIsProcessing(true);
    try {
      const sourceIds = Array.from(selectedIds).filter(id => id !== mergeTargetId);
      await onMerge(mergeTargetId, sourceIds);
      setSelectedIds(new Set());
      setShowMergeDialog(false);
      setMergeTargetId('');
    } finally {
      setIsProcessing(false);
    }
  }, [onMerge, mergeTargetId, selectedIds]);

  const openMergeDialog = useCallback(() => {
    const firstSelected = Array.from(selectedIds)[0];
    setMergeTargetId(firstSelected || '');
    setShowMergeDialog(true);
  }, [selectedIds]);

  const selectedTickets = tickets.filter(t => selectedIds.has(t.id));

  // Helper to get assignee name
  const getAssigneeName = (assigneeId: string | null | undefined) => {
    if (!assigneeId) return '-';
    const member = teamMembers.find(m => m.id === assigneeId);
    if (!member) return '-';
    const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
    return name || member.email;
  };

  // Render sort icon
  const SortIcon = ({ column }: { column: ColumnKey }) => {
    if (sortState.column !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    if (sortState.direction === 'asc') {
      return <ArrowUp className="ml-1 h-3 w-3" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border py-12">
        <svg
          className="mb-4 h-12 w-12 text-muted-foreground"
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
        <p className="text-lg font-medium">No tickets found</p>
        <p className="text-muted-foreground">
          Create a ticket or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
          <span className="text-sm font-medium px-2">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={() => handleBulkAction('resolve')} disabled={isProcessing}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Resolve
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('close')} disabled={isProcessing}>
            <Clock className="mr-1 h-4 w-4" />
            Close
          </Button>

          {teamMembers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isProcessing}>
                  <UserPlus className="mr-1 h-4 w-4" />
                  Assign
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setSelectedAssigneeId('');
                  setShowAssignDialog(true);
                }}>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Unassign
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map((member) => {
                  const displayName = [member.firstName, member.lastName].filter(Boolean).join(' ');
                  return (
                    <DropdownMenuItem
                      key={member.id}
                      onClick={() => handleBulkAction('assign', { assigneeId: member.id })}
                    >
                      {displayName || member.email}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {categories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isProcessing}>
                  <FolderOpen className="mr-1 h-4 w-4" />
                  Category
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction('setCategory', { categoryId: null })}>
                  <X className="mr-2 h-4 w-4" />
                  Remove Category
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => handleBulkAction('setCategory', { categoryId: category.id })}
                  >
                    <span
                      className="mr-2 h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color || '#666' }}
                    />
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {availableTags.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTagNames([]);
                setShowTagsDialog(true);
              }}
              disabled={isProcessing}
            >
              <Tags className="mr-1 h-4 w-4" />
              Tags
            </Button>
          )}

          {onMerge && selectedIds.size >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={openMergeDialog}
              disabled={isProcessing}
              className="text-purple-600 hover:text-purple-700"
            >
              <Merge className="mr-1 h-4 w-4" />
              Merge
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('spam')}
            disabled={isProcessing}
            className="text-orange-600 hover:text-orange-700"
          >
            <Ban className="mr-1 h-4 w-4" />
            Spam
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('delete')}
            disabled={isProcessing}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isProcessing}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              {COLUMNS.filter(col => visibleColumns.has(col.key)).map(col => (
                <TableHead key={col.key}>
                  {col.sortable ? (
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon column={col.key} />
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              <TableHead className="w-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {COLUMNS.map(col => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={visibleColumns.has(col.key)}
                        onCheckedChange={() => toggleColumn(col.key)}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map((ticket) => {
              const customerEmail = ticket.customer?.email || (ticket.customFields?.requesterEmail as string | undefined);
              const customerName = ticket.customer?.name || (ticket.customFields?.requesterName as string | undefined);
              const isSelected = selectedIds.has(ticket.id);
              return (
                <TableRow
                  key={ticket.id}
                  className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(ticket.id)}
                      aria-label={`Select ticket ${ticket.title}`}
                    />
                  </TableCell>
                  {visibleColumns.has('subject') && (
                    <TableCell>
                      <Link
                        href={`/brands/${brandId}/tickets/${ticket.id}`}
                        className="block font-medium hover:underline"
                      >
                        {ticket.title}
                      </Link>
                    </TableCell>
                  )}
                  {visibleColumns.has('status') && (
                    <TableCell>
                      {ticket.status ? <StatusBadge status={ticket.status} /> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has('priority') && (
                    <TableCell>
                      {ticket.priority ? <PriorityBadge priority={ticket.priority} /> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has('customer') && (
                    <TableCell className="text-muted-foreground">
                      {customerName || customerEmail || '-'}
                    </TableCell>
                  )}
                  {visibleColumns.has('assignee') && (
                    <TableCell className="text-muted-foreground">
                      {getAssigneeName(ticket.assigneeId)}
                    </TableCell>
                  )}
                  {visibleColumns.has('category') && (
                    <TableCell>
                      {ticket.category ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: ticket.category.color || '#6366f1' }}
                          />
                          {ticket.category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.has('created') && (
                    <TableCell className="text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                  )}
                  {visibleColumns.has('updated') && (
                    <TableCell className="text-muted-foreground">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </TableCell>
                  )}
                  <TableCell>
                    {renderActions?.(ticket)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Tickets</DialogTitle>
            <DialogDescription>
              Select which ticket to keep. The other {selectedIds.size - 1} ticket(s) will be merged into it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Keep this ticket (merge others into it):
            </label>
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target ticket" />
              </SelectTrigger>
              <SelectContent>
                {selectedTickets.map((ticket) => (
                  <SelectItem key={ticket.id} value={ticket.id}>
                    #{ticket.ticketNumber} - {ticket.title.slice(0, 40)}{ticket.title.length > 40 ? '...' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mergeTargetId && (
              <p className="text-sm text-muted-foreground mt-3">
                {selectedIds.size - 1} ticket(s) will be merged into #{selectedTickets.find(t => t.id === mergeTargetId)?.ticketNumber}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleMerge} disabled={!mergeTargetId || isProcessing}>
              {isProcessing ? 'Merging...' : 'Merge Tickets'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags Dialog */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Tags</DialogTitle>
            <DialogDescription>
              Select tags to apply to {selectedIds.size} ticket(s). This will replace all existing tags.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTagNames.includes(tag.name) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: selectedTagNames.includes(tag.name) ? (tag.color ?? undefined) : undefined,
                    borderColor: tag.color ?? undefined,
                  }}
                  onClick={() => toggleTagSelection(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            {selectedTagNames.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                {selectedTagNames.length} tag(s) selected
              </p>
            )}
            {selectedTagNames.length === 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                No tags selected - this will remove all tags from selected tickets
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagsDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleSetTags} disabled={isProcessing}>
              {isProcessing ? 'Applying...' : 'Apply Tags'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
