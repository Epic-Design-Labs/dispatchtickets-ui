'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuditLogs } from '@/lib/hooks';
import {
  AuditLog,
  AuditEventLabels,
  EntityTypeLabels,
  SourceLabels,
} from '@/types';
import { formatDistanceToNow, format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Ticket,
  MessageSquare,
  User,
  Paperclip,
  Tag,
  FolderOpen,
  Mail,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Calendar,
  Users,
  Download,
} from 'lucide-react';
import Link from 'next/link';

// Icon mapping for entity types
const entityIcons: Record<string, React.ElementType> = {
  ticket: Ticket,
  comment: MessageSquare,
  customer: User,
  attachment: Paperclip,
  tag: Tag,
  category: FolderOpen,
  email_connection: Mail,
};

// Color mapping for event types
const eventColors: Record<string, string> = {
  'ticket.created': 'bg-green-500',
  'ticket.updated': 'bg-blue-500',
  'ticket.deleted': 'bg-red-500',
  'ticket.merged': 'bg-purple-500',
  'ticket.spam_marked': 'bg-orange-500',
  'comment.created': 'bg-green-400',
  'customer.created': 'bg-green-400',
  default: 'bg-gray-500',
};

function getEventColor(event: string): string {
  return eventColors[event] || eventColors.default;
}

function formatPerformedBy(performedBy?: AuditLog['performedBy']): string {
  if (!performedBy) return 'System';

  if (performedBy.type === 'system') return 'System';
  if (performedBy.type === 'api') {
    return performedBy.apiKeyPrefix
      ? `API (${performedBy.apiKeyPrefix}...)`
      : 'API';
  }

  return performedBy.name || performedBy.email || 'Unknown';
}

function formatChanges(changes?: Record<string, { old: unknown; new: unknown }>): React.ReactNode {
  if (!changes) return null;

  const changeList = Object.entries(changes);
  if (changeList.length === 0) return null;

  return (
    <div className="mt-2 text-xs text-muted-foreground space-y-1">
      {changeList.map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} className="flex items-center gap-2">
          <span className="font-medium">{field}:</span>
          <span className="line-through opacity-60">
            {oldVal === null ? 'none' : String(oldVal)}
          </span>
          <span>→</span>
          <span>{newVal === null ? 'none' : String(newVal)}</span>
        </div>
      ))}
    </div>
  );
}

function renderMetadata(metadata?: Record<string, unknown>): React.ReactNode {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  const ticketNumber = metadata.ticketNumber;
  const title = metadata.title;

  if (!ticketNumber && !title) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {ticketNumber != null && (
        <Badge variant="outline" className="text-xs">
          #{String(ticketNumber)}
        </Badge>
      )}
      {title != null && (
        <span className="text-xs text-muted-foreground truncate max-w-xs">
          {String(title)}
        </span>
      )}
    </div>
  );
}

function AuditLogItem({ log, brandId }: { log: AuditLog; brandId: string }) {
  const Icon = entityIcons[log.entityType] || Ticket;
  const eventLabel = AuditEventLabels[log.event] || log.event;
  const sourceLabel = SourceLabels[log.source] || log.source;
  const performer = formatPerformedBy(log.performedBy);
  const timeAgo = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
  const fullTime = format(new Date(log.createdAt), 'PPpp');

  // Build link to entity if it's a ticket
  const entityLink = log.entityType === 'ticket'
    ? `/brands/${brandId}/tickets/${log.entityId}`
    : null;

  return (
    <div className="flex gap-4 py-3 border-b last:border-b-0">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getEventColor(log.event)}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">
              {eventLabel}
              {entityLink ? (
                <Link
                  href={entityLink}
                  className="ml-2 text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <span className="font-mono text-xs">{log.entityId.slice(0, 12)}...</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  {log.entityId.slice(0, 12)}...
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              by <span className="font-medium">{performer}</span>
              <span className="mx-1">•</span>
              via {sourceLabel}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap" title={fullTime}>
            {timeAgo}
          </span>
        </div>

        {/* Changes */}
        {formatChanges(log.changes)}

        {/* Metadata */}
        {renderMetadata(log.metadata)}
      </div>
    </div>
  );
}

// CSV export helper
function exportLogsToCSV(logs: AuditLog[], brandName?: string) {
  const headers = ['Date', 'Event', 'Entity Type', 'Entity ID', 'Performer', 'Source', 'Changes'];

  const rows = logs.map((log) => {
    const performer = formatPerformedBy(log.performedBy);
    const date = format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss');
    const eventLabel = AuditEventLabels[log.event] || log.event;
    const entityType = EntityTypeLabels[log.entityType] || log.entityType;
    const source = SourceLabels[log.source] || log.source;

    // Format changes as JSON string for CSV
    const changes = log.changes ? JSON.stringify(log.changes) : '';

    return [date, eventLabel, entityType, log.entityId, performer, source, changes];
  });

  // Escape CSV values
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(',')),
  ].join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  link.href = url;
  link.download = `activity-log${brandName ? `-${brandName}` : ''}-${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Date range options
type DateRangeOption = 'all' | 'today' | '7days' | '30days' | '90days';

function getDateRange(option: DateRangeOption): { startDate?: string; endDate?: string } {
  const now = new Date();
  switch (option) {
    case 'today':
      return {
        startDate: startOfDay(now).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    case '7days':
      return {
        startDate: startOfDay(subDays(now, 7)).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    case '30days':
      return {
        startDate: startOfDay(subDays(now, 30)).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    case '90days':
      return {
        startDate: startOfDay(subDays(now, 90)).toISOString(),
        endDate: endOfDay(now).toISOString(),
      };
    default:
      return {};
  }
}

export default function ActivityLogPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  // Filters
  const [entityType, setEntityType] = useState<string>('all');
  const [event, setEvent] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [performerType, setPerformerType] = useState<string>('all');

  // Build query params
  const dateParams = getDateRange(dateRange);
  const queryParams = {
    entityType: entityType !== 'all' ? entityType : undefined,
    event: event !== 'all' ? event : undefined,
    startDate: dateParams.startDate,
    endDate: dateParams.endDate,
    performerType: performerType !== 'all' ? performerType : undefined,
    limit: 50,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useAuditLogs(brandId, queryParams);

  // Flatten pages
  const logs = data?.pages.flatMap((page) => page.data) ?? [];

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for filters */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-[180px] bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-[180px] bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-[180px] bg-muted animate-pulse rounded-md" />
          <div className="h-10 w-[180px] bg-muted animate-pulse rounded-md" />
        </div>
        {/* Skeleton for timeline entries */}
        <Card className="p-4">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Failed to load activity log.</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="ticket">Tickets</SelectItem>
            <SelectItem value="comment">Comments</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="attachment">Attachments</SelectItem>
            <SelectItem value="category">Categories</SelectItem>
            <SelectItem value="tag">Tags</SelectItem>
            <SelectItem value="email_connection">Email Connections</SelectItem>
          </SelectContent>
        </Select>

        <Select value={event} onValueChange={setEvent}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            <SelectItem value="ticket.created">Created</SelectItem>
            <SelectItem value="ticket.updated">Updated</SelectItem>
            <SelectItem value="ticket.deleted">Deleted</SelectItem>
            <SelectItem value="ticket.merged">Merged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={performerType} onValueChange={setPerformerType}>
          <SelectTrigger className="w-[180px]">
            <Users className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All performers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All performers</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="api">API</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => exportLogsToCSV(logs)}
          disabled={logs.length === 0}
          title="Export to CSV"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Log List */}
      <Card className="p-4">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No activity logged yet.</p>
            <p className="text-sm mt-1">
              Events will appear here as you create and modify tickets.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <AuditLogItem key={log.id} log={log} brandId={brandId} />
            ))}
          </div>
        )}

        {/* Load more trigger */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage ? (
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Button variant="ghost" onClick={() => fetchNextPage()}>
                <ChevronDown className="w-4 h-4 mr-2" />
                Load more
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
