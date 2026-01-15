'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMentionNotifications, MentionNotification } from '@/lib/hooks/use-mention-notifications';
import { formatDistanceToNow } from 'date-fns';

function formatTimeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export function NotificationBell() {
  const { mentions, unreadCount, acknowledgeMention } = useMentionNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mentions.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {mentions.map((mention) => (
              <NotificationItem
                key={mention.id}
                mention={mention}
                onAcknowledge={() => acknowledgeMention(mention.id)}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationItem({
  mention,
  onAcknowledge,
}: {
  mention: MentionNotification;
  onAcknowledge: () => void;
}) {
  const ticketLabel =
    mention.ticketPrefix && mention.ticketNumber
      ? `${mention.ticketPrefix}-${mention.ticketNumber}`
      : 'Ticket';

  return (
    <DropdownMenuItem asChild className="cursor-pointer flex-col items-start py-3">
      <Link
        href={`/brands/${mention.brandId}/tickets/${mention.ticketId}`}
        onClick={onAcknowledge}
      >
        <div className="flex items-center gap-2 w-full">
          <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-sm font-medium">
            {mention.mentionedBy ? `${mention.mentionedBy} mentioned you` : 'You were mentioned'}
          </span>
        </div>
        <div className="pl-4 mt-1">
          <p className="text-sm text-foreground line-clamp-1">
            {ticketLabel}: {mention.ticketTitle || 'View ticket'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mention.brandName && `${mention.brandName} • `}
            {formatTimeAgo(mention.createdAt)}
          </p>
        </div>
      </Link>
    </DropdownMenuItem>
  );
}
