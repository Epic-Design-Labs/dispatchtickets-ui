'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { CloseTicketDialog } from './close-ticket-dialog';
import { Ticket, TeamMember, FieldDefinition, CloseReason } from '@/types';
import { Category } from '@/lib/api/categories';
import { Tag } from '@/lib/api/tags';
import { BulkActionType } from '@/lib/hooks/use-tickets';
import { Ban, CheckCircle, Clock, Trash2, X, Merge, UserPlus, FolderOpen, Tags, ChevronDown, UserMinus, ArrowUpDown, ArrowUp, ArrowDown, Settings2, GripVertical } from 'lucide-react';

// Column definitions - built-in columns use these keys
type BuiltInColumnKey = 'subject' | 'status' | 'priority' | 'customer' | 'assignee' | 'category' | 'created' | 'updated';

interface ColumnDef {
  key: string; // Can be built-in key or custom field key prefixed with 'cf_'
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  isCustomField?: boolean;
}

const BUILT_IN_COLUMNS: ColumnDef[] = [
  { key: 'subject', label: 'Subject', defaultVisible: true, sortable: true },
  { key: 'status', label: 'Status', defaultVisible: true, sortable: true },
  { key: 'priority', label: 'Priority', defaultVisible: true, sortable: true },
  { key: 'customer', label: 'Customer', defaultVisible: true, sortable: true },
  { key: 'company', label: 'Company', defaultVisible: false, sortable: true },
  { key: 'assignee', label: 'Assignee', defaultVisible: false, sortable: true },
  { key: 'category', label: 'Category', defaultVisible: false, sortable: true },
  { key: 'created', label: 'Created', defaultVisible: true, sortable: true },
  { key: 'updated', label: 'Updated', defaultVisible: false, sortable: true },
];

const STORAGE_KEY = 'dispatch-ticket-columns-v2'; // v2 to support new format with order
const SORT_STORAGE_KEY = 'dispatch-ticket-sort';

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

interface ColumnSettings {
  visible: string[]; // Array of visible column keys in display order
  order: string[]; // Full ordered list of all column keys
  widths: Record<string, number>; // Column widths in pixels
}

// Sortable column item for the settings dropdown
function SortableColumnItem({
  column,
  isVisible,
  onToggle
}: {
  column: ColumnDef;
  isVisible: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-sm"
    >
      <button
        className="cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Switch
        checked={isVisible}
        onCheckedChange={onToggle}
        className="scale-75"
      />
      <span className="text-sm flex-1">{column.label}</span>
      {column.isCustomField && (
        <Badge variant="outline" className="text-[10px] px-1 py-0">custom</Badge>
      )}
    </div>
  );
}

interface BulkActionOptions {
  assigneeId?: string | null;
  categoryId?: string | null;
  tags?: string[];
  closeReason?: string;
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
  customFields?: FieldDefinition[];
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
  customFields = [],
}: TicketTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  // Build all columns including custom fields
  const allColumns = useMemo<ColumnDef[]>(() => {
    const customFieldColumns: ColumnDef[] = customFields
      .filter(f => f.visible)
      .map(f => ({
        key: `cf_${f.key}`,
        label: f.label,
        defaultVisible: false,
        sortable: ['text', 'number', 'date', 'select'].includes(f.type),
        isCustomField: true,
      }));
    return [...BUILT_IN_COLUMNS, ...customFieldColumns];
  }, [customFields]);

  // Column settings state (visibility + order + widths)
  const [columnSettings, setColumnSettings] = useState<ColumnSettings>(() => {
    const defaultVisible = BUILT_IN_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
    const defaultOrder = BUILT_IN_COLUMNS.map(c => c.key);

    if (typeof window === 'undefined') {
      return { visible: defaultVisible, order: defaultOrder, widths: {} };
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Handle v3 format (with widths)
        if (parsed.visible && parsed.order && parsed.widths !== undefined) {
          return parsed as ColumnSettings;
        }
        // Handle v2 format (without widths)
        if (parsed.visible && parsed.order) {
          return { ...parsed, widths: {} } as ColumnSettings;
        }
        // Migrate from v1 format (just array of visible keys)
        if (Array.isArray(parsed)) {
          return { visible: parsed, order: defaultOrder, widths: {} };
        }
      } catch {
        // Fall through to default
      }
    }
    return { visible: defaultVisible, order: defaultOrder, widths: {} };
  });

  // Column resize state
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // Update order when custom fields change
  useEffect(() => {
    const allKeys = allColumns.map(c => c.key);
    setColumnSettings(prev => {
      // Add any new columns that aren't in order yet
      const newKeys = allKeys.filter(k => !prev.order.includes(k));
      if (newKeys.length > 0) {
        return { ...prev, order: [...prev.order, ...newKeys] };
      }
      return prev;
    });
  }, [allColumns]);

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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get ordered columns (respecting user's order preference)
  const orderedColumns = useMemo(() => {
    const columnMap = new Map(allColumns.map(c => [c.key, c]));
    const ordered: ColumnDef[] = [];
    // First add columns in user's order
    for (const key of columnSettings.order) {
      const col = columnMap.get(key);
      if (col) ordered.push(col);
    }
    // Then add any remaining columns not in order
    for (const col of allColumns) {
      if (!columnSettings.order.includes(col.key)) {
        ordered.push(col);
      }
    }
    return ordered;
  }, [allColumns, columnSettings.order]);

  // Visible columns in order
  const visibleColumns = useMemo(() => {
    return orderedColumns.filter(c => columnSettings.visible.includes(c.key));
  }, [orderedColumns, columnSettings.visible]);

  // Persist column settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnSettings));
  }, [columnSettings]);

  // Persist sort state
  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortState));
  }, [sortState]);

  const toggleColumn = useCallback((key: string) => {
    setColumnSettings(prev => {
      const isVisible = prev.visible.includes(key);
      return {
        ...prev,
        visible: isVisible
          ? prev.visible.filter(k => k !== key)
          : [...prev.visible, key],
      };
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnSettings(prev => {
        const oldIndex = prev.order.indexOf(active.id as string);
        const newIndex = prev.order.indexOf(over.id as string);
        return {
          ...prev,
          order: arrayMove(prev.order, oldIndex, newIndex),
        };
      });
    }
  }, []);

  const handleSort = useCallback((column: string) => {
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

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(currentWidth);
  }, []);

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff); // Min width 80px
      setColumnSettings(prev => ({
        ...prev,
        widths: { ...prev.widths, [resizingColumn]: newWidth },
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  const getColumnWidth = useCallback((columnKey: string): number | undefined => {
    return columnSettings.widths[columnKey];
  }, [columnSettings.widths]);

  const resetColumnWidth = useCallback((columnKey: string) => {
    setColumnSettings(prev => {
      const newWidths = { ...prev.widths };
      delete newWidths[columnKey];
      return { ...prev, widths: newWidths };
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

      // Handle custom field columns
      if (column.startsWith('cf_')) {
        const fieldKey = column.slice(3); // Remove 'cf_' prefix
        const aCustomFields = a.customFields as Record<string, unknown> || {};
        const bCustomFields = b.customFields as Record<string, unknown> || {};
        const aFieldVal = aCustomFields[fieldKey];
        const bFieldVal = bCustomFields[fieldKey];

        // Handle different value types
        if (typeof aFieldVal === 'number' && typeof bFieldVal === 'number') {
          aVal = aFieldVal;
          bVal = bFieldVal;
        } else if (aFieldVal instanceof Date || bFieldVal instanceof Date) {
          aVal = aFieldVal ? new Date(aFieldVal as string).getTime() : 0;
          bVal = bFieldVal ? new Date(bFieldVal as string).getTime() : 0;
        } else {
          aVal = String(aFieldVal || '').toLowerCase();
          bVal = String(bFieldVal || '').toLowerCase();
        }
      } else {
        // Built-in columns
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
            aVal = priorityOrder[(a.priority || 'normal') as keyof typeof priorityOrder] ?? 2;
            bVal = priorityOrder[(b.priority || 'normal') as keyof typeof priorityOrder] ?? 2;
            break;
          case 'customer':
            aVal = (a.customer?.name || a.customer?.email || '').toLowerCase();
            bVal = (b.customer?.name || b.customer?.email || '').toLowerCase();
            break;
          case 'assignee':
            aVal = a.assigneeId || '';
            bVal = b.assigneeId || '';
            break;
          case 'company':
            aVal = a.customer?.company?.name?.toLowerCase() || '';
            bVal = b.customer?.company?.name?.toLowerCase() || '';
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

  const handleClose = useCallback(async (closeReason: CloseReason) => {
    await handleBulkAction('close', { closeReason });
    setShowCloseDialog(false);
  }, [handleBulkAction]);

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

  // Helper to get assignee info
  const getAssigneeInfo = (assigneeId: string | null | undefined) => {
    if (!assigneeId) return null;
    const member = teamMembers.find(m => m.id === assigneeId);
    if (!member) return null;
    const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
    return {
      name: name || member.email,
      email: member.email,
      initials: name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : member.email.slice(0, 2).toUpperCase(),
    };
  };

  // Legacy helper for backward compatibility
  const getAssigneeName = (assigneeId: string | null | undefined) => {
    const info = getAssigneeInfo(assigneeId);
    return info ? info.name : '-';
  };

  // Render sort icon
  const SortIcon = ({ column }: { column: string }) => {
    if (sortState.column !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    if (sortState.direction === 'asc') {
      return <ArrowUp className="ml-1 h-3 w-3" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Render cell value for a column
  const renderCellValue = (ticket: Ticket, columnKey: string) => {
    // Handle custom fields
    if (columnKey.startsWith('cf_')) {
      const fieldKey = columnKey.slice(3);
      const customFields = ticket.customFields as Record<string, unknown> || {};
      const value = customFields[fieldKey];

      if (value === undefined || value === null) {
        return <span className="text-muted-foreground">-</span>;
      }

      // Handle different value types
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(', ') : <span className="text-muted-foreground">-</span>;
      }
      if (typeof value === 'object') {
        return <span className="text-xs font-mono">{JSON.stringify(value)}</span>;
      }
      // Check if it's a date string
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value).toLocaleDateString();
      }
      return String(value);
    }

    // Built-in columns
    const customerEmail = ticket.customer?.email || (ticket.customFields?.requesterEmail as string | undefined);
    const customerName = ticket.customer?.name || (ticket.customFields?.requesterName as string | undefined);

    switch (columnKey) {
      case 'subject':
        return (
          <Link
            href={`/brands/${brandId}/tickets/${ticket.id}`}
            className="block font-medium hover:underline truncate max-w-[400px]"
            title={ticket.title}
          >
            {ticket.title}
          </Link>
        );
      case 'status':
        return ticket.status ? <StatusBadge status={ticket.status} statusRef={ticket.statusRef} /> : <span className="text-muted-foreground">-</span>;
      case 'priority':
        return <PriorityBadge priority={ticket.priority || 'normal'} />;
      case 'customer':
        return <span className="text-muted-foreground">{customerName || customerEmail || '-'}</span>;
      case 'company':
        return ticket.customer?.company ? (
          <Link
            href={`/brands/${brandId}/companies/${ticket.customer.company.id}`}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {ticket.customer.company.name}
          </Link>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'assignee': {
        const assignee = getAssigneeInfo(ticket.assigneeId);
        if (!assignee) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 cursor-default">
                  <AvatarFallback className="text-xs">{assignee.initials}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p className="font-medium">{assignee.name}</p>
                  {assignee.name !== assignee.email && (
                    <p className="text-muted-foreground">{assignee.email}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      case 'category':
        return ticket.category ? (
          <span className="flex items-center gap-1.5 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ticket.category.color || '#6366f1' }}
            />
            {ticket.category.name}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case 'created':
        return <span className="text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>;
      case 'updated':
        return <span className="text-muted-foreground">{new Date(ticket.updatedAt).toLocaleDateString()}</span>;
      default:
        return <span className="text-muted-foreground">-</span>;
    }
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
          <Button variant="outline" size="sm" onClick={() => setShowCloseDialog(true)} disabled={isProcessing}>
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

      {/* Columns Settings Toolbar */}
      <div className="flex justify-end mb-2">
        <DropdownMenu open={columnSettingsOpen} onOpenChange={setColumnSettingsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-1 h-4 w-4" />
              Columns
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedColumns.map(c => c.key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-h-[300px] overflow-y-auto">
                  {orderedColumns.map(col => (
                    <SortableColumnItem
                      key={col.key}
                      column={col}
                      isVisible={columnSettings.visible.includes(col.key)}
                      onToggle={() => toggleColumn(col.key)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className={resizingColumn ? 'select-none' : ''} style={{ minWidth: 'max-content' }}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 sticky left-0 z-20 bg-background">
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
              {visibleColumns.map((col, index) => {
                const width = getColumnWidth(col.key);
                const isFirstColumn = index === 0;
                const stickyClasses = isFirstColumn
                  ? 'sticky left-12 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                  : '';
                return (
                  <TableHead
                    key={col.key}
                    className={`relative group whitespace-normal ${stickyClasses}`}
                    style={width
                      ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                      : { minWidth: 'min-content' }
                    }
                  >
                    {col.sortable ? (
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-left"
                        onClick={() => handleSort(col.key)}
                      >
                        <span>{col.label}</span>
                        <SortIcon column={col.key} />
                      </button>
                    ) : (
                      col.label
                    )}
                    {/* Resize handle */}
                    <div
                      className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 ${
                        resizingColumn === col.key ? 'bg-primary' : 'bg-transparent group-hover:bg-border'
                      }`}
                      onMouseDown={(e) => {
                        const th = e.currentTarget.parentElement;
                        const currentWidth = th?.offsetWidth || 150;
                        handleResizeStart(e, col.key, currentWidth);
                      }}
                      onDoubleClick={() => resetColumnWidth(col.key)}
                      title="Drag to resize, double-click to reset"
                    />
                  </TableHead>
                );
              })}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.map((ticket) => {
              const isSelected = selectedIds.has(ticket.id);
              return (
                <TableRow
                  key={ticket.id}
                  className={`group cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                >
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className={`sticky left-0 z-20 group-hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : 'bg-background'}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(ticket.id)}
                      aria-label={`Select ticket ${ticket.title}`}
                    />
                  </TableCell>
                  {visibleColumns.map((col, index) => {
                    const width = getColumnWidth(col.key);
                    const isFirstColumn = index === 0;
                    const stickyClasses = isFirstColumn
                      ? `sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : 'bg-background'}`
                      : '';
                    return (
                      <TableCell
                        key={col.key}
                        style={width
                          ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                          : { minWidth: 'min-content' }
                        }
                        className={`${width ? 'truncate' : ''} ${stickyClasses}`}
                      >
                        {renderCellValue(ticket, col.key)}
                      </TableCell>
                    );
                  })}
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

      {/* Close Ticket Dialog */}
      <CloseTicketDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        ticketCount={selectedIds.size}
        onConfirm={handleClose}
        isProcessing={isProcessing}
      />
    </div>
  );
}
