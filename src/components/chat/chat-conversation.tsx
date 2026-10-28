'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentThread, CommentEditor } from '@/components/comments';
import { WaitingBadge } from '@/components/chat/waiting-badge';
import { TicketChatSection } from '@/components/chat/ticket-chat-section';
import { ConvertChatButton } from '@/components/chat/convert-chat-button';
import { useComments, useTeamMembers, useTicket, useUpdateTicket } from '@/lib/hooks';
import { useVisitorTyping } from '@/lib/live/chat-activity';
import type { Comment } from '@/types';

/**
 * One chat in the Chat tab: the thread, the reply box under the latest
 * message, and the visitor beside it. The full ticket page is a link away for
 * anything this doesn't do (tags, fields, merge).
 */
export function ChatConversation({ brandId, ticketId }: { brandId: string; ticketId: string }) {
  const { data: ticket, isLoading: ticketLoading } = useTicket(brandId, ticketId, { polling: true });
  const { data: comments, isLoading: commentsLoading } = useComments(brandId, ticketId, { polling: true, live: true });
  const { data: teamData } = useTeamMembers({ brandId });
  const updateTicket = useUpdateTicket(brandId, ticketId);
  const typing = useVisitorTyping(ticketId);
  const router = useRouter();

  // Open on the latest message and follow new ones, unless the agent has
  // scrolled up to read. Same rule as the ticket page's chat pane.
  const paneRef = useRef<HTMLDivElement>(null);
  const seen = useRef(0);
  useEffect(() => {
    seen.current = 0;
  }, [ticketId]);
  useEffect(() => {
    const pane = paneRef.current;
    const count = (comments?.length ?? 0) + (typing ? 1 : 0);
    if (!pane || count === seen.current) return;
    const nearBottom = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 120;
    if (seen.current === 0 || nearBottom) pane.scrollTop = pane.scrollHeight;
    seen.current = count;
  }, [comments?.length, typing, ticketId]);

  if (ticketLoading || !ticket) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const thread: Comment[] = ticket.body
    ? [
        {
          id: 'ticket-body',
          ticketId: ticket.id,
          authorId: ticket.customerId,
          authorType: 'CUSTOMER',
          body: ticket.body,
          metadata: { isTicketBody: true },
          createdAt: ticket.createdAt,
          updatedAt: ticket.createdAt,
        },
        ...(comments || []),
      ]
    : comments || [];

  const resolve = async () => {
    try {
      await updateTicket.mutateAsync({ status: 'resolved' });
      toast.success(`Resolved #${ticket.ticketNumber}`);
    } catch {
      toast.error('Failed to resolve');
    }
  };

  const isOpen = !['resolved', 'closed'].includes(String(ticket.status));

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-medium" title={ticket.title}>
              {ticket.title}
            </h2>
            <p className="text-xs text-muted-foreground">#{ticket.ticketNumber}</p>
          </div>
          <WaitingBadge ticket={ticket} />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Converted, it leaves this queue: carry on from the ticket page. */}
            <ConvertChatButton
              brandId={brandId}
              ticket={ticket}
              onConverted={() => router.push(`/brands/${brandId}/tickets/${ticketId}`)}
            />
            {isOpen && (
              <Button size="sm" variant="outline" onClick={resolve} disabled={updateTicket.isPending}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Resolve
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/brands/${brandId}/tickets/${ticketId}`}>
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Full ticket
              </Link>
            </Button>
          </div>
        </header>

        <div ref={paneRef} className="min-h-0 flex-1 overflow-y-auto bg-background px-4 py-4">
          <CommentThread
            order="oldest"
            comments={thread}
            isLoading={commentsLoading}
            brandId={brandId}
            customer={ticket.customer}
            teamMembers={teamData?.members || []}
          />
          {typing && (
            <p className="mt-3 text-sm italic text-muted-foreground" aria-live="polite">
              Visitor is typing…
            </p>
          )}
        </div>

        <div className="border-t bg-background p-4">
          {/* Keyed so a switch starts a clean draft and re-focuses. */}
          <CommentEditor key={ticketId} brandId={brandId} ticketId={ticketId} chat />
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 overflow-y-auto border-l bg-gray-50 p-4 xl:block">
        <TicketChatSection brandId={brandId} ticketId={ticketId} isChat converted={!!ticket.chatConvertedAt} />
      </aside>
    </div>
  );
}
