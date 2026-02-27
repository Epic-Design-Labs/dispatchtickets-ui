'use client';

import { useMemo, useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
import { useDashboardTickets, useDashboardStats, useBrands, useTeamMembers } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { DashboardTicketFilters, TicketFilters as TicketFiltersType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import { StatusBadge } from '@/components/tickets/status-badge';
import { PriorityBadge } from '@/components/tickets/priority-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getGravatarUrl } from '@/lib/gravatar';
import { toast } from 'sonner';
import {
  Plus,
  RefreshCw,
  MessageSquare,
  Timer,
  Settings2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ViewType = 'all' | 'mine' | 'unassigned';

// Column definitions for global dashboard (matching brand view + brand column)
interface DashboardColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const DASHBOARD_COLUMNS: DashboardColumnDef[] = [
  { key: 'brand', label: 'Brand', defaultVisible: true },
  { key: 'subject', label: 'Subject', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'priority', label: 'Priority', defaultVisible: true },
  { key: 'customer', label: 'Customer', defaultVisible: true },
  { key: 'company', label: 'Company', defaultVisible: false },
  { key: 'assignee', label: 'Assignee', defaultVisible: false },
  { key: 'category', label: 'Category', defaultVisible: false },
  { key: 'created', label: 'Created', defaultVisible: true },
  { key: 'updated', label: 'Updated', defaultVisible: false },
];

interface DashboardColumnSettings {
  visible: string[];
  order: string[];
}

const DASHBOARD_COLUMNS_STORAGE_KEY = 'dispatch-dashboard-columns-v2';

function getDefaultColumnSettings(): DashboardColumnSettings {
  return {
    visible: DASHBOARD_COLUMNS.filter(c => c.defaultVisible).map(c => c.key),
    order: DASHBOARD_COLUMNS.map(c => c.key),
  };
}

// Sortable column item for the settings dropdown
function SortableDashboardColumnItem({
  column,
  isVisible,
  onToggle,
}: {
  column: DashboardColumnDef;
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
    </div>
  );
}
const DASHBOARD_SORT_STORAGE_KEY = 'dispatch-dashboard-sort';

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

// Map dashboard column keys to API sort field names
const DASHBOARD_COLUMN_TO_API_SORT: Record<string, string> = {
  subject: 'title',
  status: 'status',
  priority: 'priority',
  customer: 'customer',
  company: 'company',
  assignee: 'assignee',
  category: 'category',
  created: 'createdAt',
  updated: 'updatedAt',
};

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

function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}


export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: brands } = useBrands();
  const { data: teamMembersData } = useTeamMembers();
  const teamMembers = teamMembersData?.members;

  // Column settings state (visibility + order)
  const [columnSettings, setColumnSettings] = useState<DashboardColumnSettings>(() => {
    if (typeof window === 'undefined') return getDefaultColumnSettings();
    try {
      const saved = localStorage.getItem(DASHBOARD_COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DashboardColumnSettings;
        // Ensure any new columns get added to the order
        const allKeys = DASHBOARD_COLUMNS.map(c => c.key);
        const missingKeys = allKeys.filter(k => !parsed.order.includes(k));
        if (missingKeys.length > 0) {
          parsed.order = [...parsed.order, ...missingKeys];
        }
        return parsed;
      }
    } catch {}
    return getDefaultColumnSettings();
  });

  const saveColumnSettings = useCallback((settings: DashboardColumnSettings) => {
    setColumnSettings(settings);
    try {
      localStorage.setItem(DASHBOARD_COLUMNS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setColumnSettings(prev => {
      const isVisible = prev.visible.includes(key);
      const newSettings = {
        ...prev,
        visible: isVisible
          ? prev.visible.filter(k => k !== key)
          : [...prev.visible, key],
      };
      try {
        localStorage.setItem(DASHBOARD_COLUMNS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch {}
      return newSettings;
    });
  }, []);

  // DnD sensors for column reordering
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleColumnDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setColumnSettings(prev => {
      const oldIndex = prev.order.indexOf(active.id as string);
      const newIndex = prev.order.indexOf(over.id as string);
      const newSettings = {
        ...prev,
        order: arrayMove(prev.order, oldIndex, newIndex),
      };
      try {
        localStorage.setItem(DASHBOARD_COLUMNS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch {}
      return newSettings;
    });
  }, []);

  // Build ordered column definitions for the dropdown and table
  const orderedColumns = useMemo(() => {
    return columnSettings.order
      .map(key => DASHBOARD_COLUMNS.find(c => c.key === key))
      .filter((c): c is DashboardColumnDef => !!c);
  }, [columnSettings.order]);

  // Visible columns in display order
  const visibleColumnDefs = useMemo(() => {
    return orderedColumns.filter(c => columnSettings.visible.includes(c.key));
  }, [orderedColumns, columnSettings.visible]);

  // Sort state
  const [sortState, setSortState] = useState<SortState>(() => {
    if (typeof window === 'undefined') return { column: null, direction: null };
    try {
      const stored = localStorage.getItem(DASHBOARD_SORT_STORAGE_KEY);
      if (stored) return JSON.parse(stored) as SortState;
    } catch {}
    return { column: null, direction: null };
  });

  const handleSort = useCallback((column: string) => {
    setSortState(prev => {
      let next: SortState;
      if (prev.column !== column) {
        next = { column, direction: 'asc' };
      } else if (prev.direction === 'asc') {
        next = { column, direction: 'desc' };
      } else {
        next = { column: null, direction: null };
      }
      try {
        localStorage.setItem(DASHBOARD_SORT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Sort icon component
  const SortIcon = ({ column }: { column: string }) => {
    if (sortState.column !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    if (sortState.direction === 'asc') {
      return <ArrowUp className="ml-1 h-3 w-3" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };

  // Parse URL params
  const view = (searchParams.get('view') || 'all') as ViewType;
  const status = searchParams.get('status') || undefined;
  const priority = searchParams.get('priority') || undefined;
  const search = searchParams.get('search') || undefined;
  const brandsParam = searchParams.get('brands');
  const selectedBrands = brandsParam ? brandsParam.split(',').filter(Boolean) : [];

  // Update URL params helper
  const updateUrlParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          current.set(key, value);
        } else {
          current.delete(key);
        }
      });
      router.push(`/dashboard?${current.toString()}`);
    },
    [searchParams, router]
  );

  // Handle filter changes from TicketFilters component
  const handleFiltersChange = useCallback(
    (newFilters: TicketFiltersType) => {
      updateUrlParams({
        status: newFilters.status,
        priority: newFilters.priority,
        search: newFilters.search,
      });
    },
    [updateUrlParams]
  );

  // Handle brand filter changes
  const handleBrandFilterChange = useCallback(
    (brandIds: string[]) => {
      updateUrlParams({
        brands: brandIds.length > 0 ? brandIds.join(',') : undefined,
      });
    },
    [updateUrlParams]
  );

  // Current filters for TicketFilters component
  const currentFilters: TicketFiltersType = useMemo(
    () => ({
      status,
      priority,
      search,
    }),
    [status, priority, search]
  );

  // Build filters based on view
  // 'all' means show all statuses (no filter), undefined/default means 'active' (open+pending)
  const apiStatus = status === 'all' ? undefined : (status || 'active');

  const apiFilters: DashboardTicketFilters = useMemo(() => {
    const baseFilters: DashboardTicketFilters = {
      brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
      limit: 50,
      priority,
      search,
    };

    // Add sort/order if active
    if (sortState.column && sortState.direction) {
      const apiSort = DASHBOARD_COLUMN_TO_API_SORT[sortState.column];
      if (apiSort) {
        baseFilters.sort = apiSort;
        baseFilters.order = sortState.direction;
      }
    }

    switch (view) {
      case 'mine':
        return {
          ...baseFilters,
          assigneeId: session?.memberId,
          status: apiStatus,
        };
      case 'unassigned':
        return {
          ...baseFilters,
          assigneeId: 'null',
          status: apiStatus,
        };
      case 'all':
      default:
        return {
          ...baseFilters,
          status: apiStatus,
        };
    }
  }, [apiStatus, priority, search, selectedBrands, view, session?.memberId, sortState]);

  const { data: ticketsData, isLoading: ticketsLoading } = useDashboardTickets(apiFilters);
  // For "all" view, use global stats; for "mine"/"unassigned", we need to fetch ALL tickets for that view
  // to get accurate counts (not just the first page)
  const allTicketsFilters: DashboardTicketFilters = useMemo(() => ({
    brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
    assigneeId: view === 'mine' ? session?.memberId : (view === 'unassigned' ? 'null' : undefined),
    limit: 100, // Max allowed by API
  }), [view, selectedBrands, session?.memberId]);

  const { data: allTicketsData, isLoading: allTicketsLoading } = useDashboardTickets(
    allTicketsFilters,
    { enabled: view !== 'all' } // Only fetch for mine/unassigned views
  );
  const { data: globalStats, isLoading: globalStatsLoading } = useDashboardStats({
    brandIds: selectedBrands.length > 0 ? selectedBrands : undefined,
  });

  // Calculate stats - use global for "all" view, compute from tickets for "mine"/"unassigned"
  const displayStats = useMemo(() => {
    if (view === 'all') {
      return {
        open: globalStats?.open || 0,
        pending: globalStats?.pending || 0,
        resolved: globalStats?.resolved || 0,
        closed: globalStats?.closed || 0,
      };
    }
    // Calculate from loaded tickets
    const tickets = allTicketsData?.data || [];
    return {
      open: tickets.filter(t => t.status === 'open').length,
      pending: tickets.filter(t => t.status === 'pending').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
    };
  }, [view, globalStats, allTicketsData?.data]);

  const stats = displayStats;
  const statsLoading = view === 'all' ? globalStatsLoading : allTicketsLoading;
  const statsTotal = stats.open + stats.pending + stats.resolved + stats.closed;
  const statsActive = stats.open + stats.pending;

  // Handle clicking on a stat card to filter
  const handleStatClick = (newStatus: string) => {
    if (newStatus === status || (newStatus === 'active' && !status)) {
      // Already showing this status, go back to default (active)
      updateUrlParams({ status: undefined });
    } else {
      updateUrlParams({ status: newStatus });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Refreshed');
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sort tickets: open first (by newest), then pending (by newest)
  // Skip grouping when user has an explicit sort active
  const hasExplicitSort = !!sortState.column;
  const tickets = useMemo(() => {
    const rawTickets = ticketsData?.data || [];
    // Only apply grouping when showing "active" and no explicit sort
    if ((!status || status === 'active') && !hasExplicitSort) {
      const openTickets = rawTickets
        .filter(t => t.status === 'open')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const pendingTickets = rawTickets
        .filter(t => t.status === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return [...openTickets, ...pendingTickets];
    }

    // Client-side sort for brand column (not API-sortable)
    if (sortState.column === 'brand' && sortState.direction) {
      const dir = sortState.direction === 'asc' ? 1 : -1;
      return [...rawTickets].sort((a, b) => {
        const aName = a.brand?.name?.toLowerCase() || '';
        const bName = b.brand?.name?.toLowerCase() || '';
        if (aName < bName) return -1 * dir;
        if (aName > bName) return 1 * dir;
        return 0;
      });
    }

    return rawTickets;
  }, [ticketsData?.data, status, hasExplicitSort, sortState]);

  return (
    <div className="h-full overflow-auto p-6">
      {/* Stats Pills - Matching brand view style */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'active' || !status
              ? 'bg-violet-500 text-white'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('active')}
        >
          <span className={`h-2 w-2 rounded-full ${status === 'active' || !status ? 'bg-blue-300' : 'bg-blue-500'}`} />
          <span>Active</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : statsActive}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'all'
              ? 'bg-white border-2 border-blue-500'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('all')}
        >
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span>All</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : statsTotal}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'open'
              ? 'bg-blue-50 border-2 border-blue-400 text-blue-700'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('open')}
        >
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span>Open</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : stats.open}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'pending'
              ? 'bg-amber-50 border-2 border-amber-400 text-amber-700'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('pending')}
        >
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>Pending</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : stats.pending}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'resolved'
              ? 'bg-green-50 border-2 border-green-400 text-green-700'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('resolved')}
        >
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Resolved</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : stats.resolved}</span>
        </button>

        <button
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            status === 'closed'
              ? 'bg-green-50 border-2 border-green-400 text-green-700'
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => handleStatClick('closed')}
        >
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Closed</span>
          <span className="font-bold text-lg ml-2">{statsLoading ? '...' : stats.closed}</span>
        </button>

        {/* Metrics pills */}
        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <MessageSquare className="h-4 w-4 text-purple-500" />
          <span className="font-bold text-lg">{statsLoading ? '...' : formatDuration(globalStats?.responseMetrics?.avgFirstResponseMinutes)}</span>
          <span className="text-muted-foreground">Avg Response</span>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium bg-white border border-gray-200">
          <Timer className="h-4 w-4 text-indigo-500" />
          <span className="font-bold text-lg">{statsLoading ? '...' : formatDuration(globalStats?.responseMetrics?.avgResolutionMinutes)}</span>
          <span className="text-muted-foreground">Avg Resolution</span>
        </div>
      </div>

      {/* Tickets Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Tickets
          {status && status !== 'active' && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (filtered by {status === 'all' ? 'all statuses' : status})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <CreateTicketDialog>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </CreateTicketDialog>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <TicketFilters
            filters={currentFilters}
            onFiltersChange={handleFiltersChange}
            brands={brands}
            selectedBrandIds={selectedBrands}
            onBrandFilterChange={handleBrandFilterChange}
            showBrandFilter
            teamMembers={teamMembers}
          />
        </div>
        <DropdownMenu>
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
              onDragEnd={handleColumnDragEnd}
            >
              <SortableContext
                items={orderedColumns.map(c => c.key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-h-[300px] overflow-y-auto">
                  {orderedColumns.map(col => (
                    <SortableDashboardColumnItem
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

      {/* Tickets Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumnDefs.map(col => {
                const widthClass = col.key === 'brand' ? 'w-[100px]'
                  : col.key === 'subject' ? ''
                  : col.key === 'status' ? 'w-[100px]'
                  : col.key === 'priority' ? 'w-[100px]'
                  : col.key === 'customer' ? 'w-[150px]'
                  : col.key === 'company' ? 'w-[150px]'
                  : col.key === 'assignee' ? 'w-[140px]'
                  : col.key === 'category' ? 'w-[120px]'
                  : col.key === 'created' ? 'w-[120px]'
                  : col.key === 'updated' ? 'w-[120px]'
                  : '';
                return (
                  <TableHead key={col.key} className={widthClass}>
                    <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort(col.key)}>
                      {col.label} <SortIcon column={col.key} />
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsLoading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnDefs.length || 7} className="text-center py-8">
                  <div className="text-muted-foreground">Loading tickets...</div>
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnDefs.length || 7} className="text-center py-8">
                  <div className="text-muted-foreground">No tickets found</div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const assignee = ticket.assigneeId
                  ? teamMembers?.find((m) => m.id === ticket.assigneeId)
                  : null;
                return (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(`/brands/${ticket.brandId}/tickets/${ticket.id}`)
                  }
                >
                  {visibleColumnDefs.map(col => (
                    <TableCell key={col.key}>
                      {col.key === 'brand' && (
                        <div className="flex items-center gap-2">
                          {ticket.brand.iconUrl ? (
                            <img
                              src={ticket.brand.iconUrl}
                              alt={ticket.brand.name}
                              className="w-5 h-5 rounded"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              {ticket.brand.ticketPrefix?.charAt(0) || 'B'}
                            </div>
                          )}
                          <Badge variant="outline" className="font-mono text-xs">
                            {ticket.brand.ticketPrefix}
                          </Badge>
                        </div>
                      )}
                      {col.key === 'subject' && (
                        <div className="font-medium truncate max-w-[400px]">
                          {ticket.title}
                        </div>
                      )}
                      {col.key === 'status' && ticket.status && (
                        <StatusBadge status={ticket.status} statusRef={ticket.statusRef} />
                      )}
                      {col.key === 'priority' && (
                        ticket.priority ? (
                          <PriorityBadge priority={ticket.priority as 'low' | 'normal' | 'medium' | 'high' | 'urgent'} />
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )
                      )}
                      {col.key === 'customer' && (
                        <div className="text-sm truncate">
                          {ticket.customer?.name || ticket.customer?.email || '-'}
                        </div>
                      )}
                      {col.key === 'company' && (
                        <span className="text-sm text-muted-foreground truncate">
                          {ticket.customer?.company?.name || '-'}
                        </span>
                      )}
                      {col.key === 'assignee' && (
                        assignee ? (() => {
                          const name = [assignee.firstName, assignee.lastName].filter(Boolean).join(' ');
                          const displayName = name || assignee.email;
                          const initials = name
                            ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : assignee.email.slice(0, 2).toUpperCase();
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Avatar className="h-7 w-7 cursor-default">
                                    <AvatarImage src={assignee.avatarUrl || getGravatarUrl(assignee.email)} alt={displayName} />
                                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm">
                                    <p className="font-medium">{displayName}</p>
                                    {name && name !== assignee.email && (
                                      <p className="text-muted-foreground">{assignee.email}</p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })() : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )
                      )}
                      {col.key === 'category' && (
                        ticket.category ? (
                          <Badge variant="outline" className="text-xs">
                            <span
                              className="w-2 h-2 rounded-full mr-1.5"
                              style={{ backgroundColor: ticket.category.color || '#6366f1' }}
                            />
                            {ticket.category.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )
                      )}
                      {col.key === 'created' && (
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgo(ticket.createdAt)}
                        </span>
                      )}
                      {col.key === 'updated' && (
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgo(ticket.updatedAt)}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                );
              })
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
    </div>
  );
}
