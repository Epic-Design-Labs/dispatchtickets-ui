'use client';

import { useTicketAuditLogs } from '@/lib/hooks';
import { AuditLog } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  PlusCircle,
  Edit,
  Trash2,
  Merge,
  MessageSquare,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  User,
  Bot,
  Globe,
  History,
} from 'lucide-react';

interface TicketHistoryProps {
  brandId: string;
  ticketId: string;
}

function getEventIcon(event: string) {
  switch (event) {
    case 'ticket.created':
      return <PlusCircle className="h-3.5 w-3.5 text-green-500" />;
    case 'ticket.updated':
      return <Edit className="h-3.5 w-3.5 text-blue-500" />;
    case 'ticket.deleted':
      return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
    case 'ticket.merged':
      return <Merge className="h-3.5 w-3.5 text-purple-500" />;
    case 'ticket.spam_marked':
      return <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />;
    case 'ticket.spam_unmarked':
      return <ShieldCheck className="h-3.5 w-3.5 text-green-500" />;
    case 'comment.created':
    case 'comment.updated':
    case 'comment.deleted':
      return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
    case 'attachment.uploaded':
    case 'attachment.deleted':
      return <Paperclip className="h-3.5 w-3.5 text-gray-500" />;
    default:
      return <History className="h-3.5 w-3.5 text-gray-400" />;
  }
}

function getEventLabel(event: string): string {
  const labels: Record<string, string> = {
    'ticket.created': 'Ticket created',
    'ticket.updated': 'Ticket updated',
    'ticket.deleted': 'Ticket deleted',
    'ticket.merged': 'Tickets merged',
    'ticket.spam_marked': 'Marked as spam',
    'ticket.spam_unmarked': 'Unmarked as spam',
    'comment.created': 'Comment added',
    'comment.updated': 'Comment edited',
    'comment.deleted': 'Comment deleted',
    'attachment.uploaded': 'Attachment uploaded',
    'attachment.deleted': 'Attachment deleted',
  };
  return labels[event] || event;
}

function getPerformerIcon(type: string) {
  switch (type) {
    case 'user':
      return <User className="h-3 w-3" />;
    case 'api':
      return <Globe className="h-3 w-3" />;
    case 'system':
      return <Bot className="h-3 w-3" />;
    default:
      return null;
  }
}

function getPerformerName(performedBy: AuditLog['performedBy']): string {
  if (!performedBy) return 'System';
  if (performedBy.name) return performedBy.name;
  if (performedBy.email) return performedBy.email;
  if (performedBy.type === 'api') return 'API';
  if (performedBy.type === 'system') return 'System';
  return 'Unknown';
}

function formatChanges(changes: AuditLog['changes']): string[] {
  if (!changes) return [];

  const changeList: string[] = [];
  for (const [field, value] of Object.entries(changes)) {
    if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
      changeList.push(`${field}: ${value.old || '(none)'} → ${value.new || '(none)'}`);
    }
  }
  return changeList;
}

export function TicketHistory({ brandId, ticketId }: TicketHistoryProps) {
  const { data: logs, isLoading, error } = useTicketAuditLogs(brandId, ticketId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Failed to load history
      </p>
    );
  }

  // Filter out comment events - those are shown in Activity
  const filteredLogs = logs?.filter(log =>
    !log.event.startsWith('comment.')
  ) || [];

  if (filteredLogs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No activity recorded yet
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {filteredLogs.map((log, index) => {
        const isLast = index === filteredLogs.length - 1;
        const changes = formatChanges(log.changes);
        const performedBy = log.performedBy as AuditLog['performedBy'];

        return (
          <div key={log.id} className="flex gap-3 pb-3">
            {/* Timeline line */}
            <div className="relative flex flex-col items-center">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                {getEventIcon(log.event)}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-medium">
                {getEventLabel(log.event)}
              </p>

              {/* Changes */}
              {changes.length > 0 && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {changes.map((change, i) => (
                    <div key={i}>{change}</div>
                  ))}
                </div>
              )}

              {/* Performer and time */}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {getPerformerIcon(performedBy?.type || 'system')}
                  {getPerformerName(performedBy)}
                </span>
                <span>·</span>
                <span>
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
