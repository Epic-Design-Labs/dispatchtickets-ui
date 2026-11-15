'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink, Mail, RotateCcw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentEditor } from '@/components/comments';
import { PersonAvatar } from '@/components/person-avatar';
import { WaitingBadge } from '@/components/chat/waiting-badge';
import { ChatThread } from '@/components/chat/chat-thread';
import { TicketChatSection } from '@/components/chat/ticket-chat-section';
import { ConvertChatButton } from '@/components/chat/convert-chat-button';
import { chatWho } from '@/components/chat/chat-who';
import { chatDelivery, sendLabelFor, type ChatDelivery } from '@/components/chat/chat-delivery';
import { useComments, useTeamMembers, useTicket, useUpdateTicket } from '@/lib/hooks';
import { useChatVisitor } from '@/lib/hooks/use-chat';
import { useVisitorTyping } from '@/lib/live/chat-activity';
import { useAuth } from '@/providers';
import { cn, formatTimeAgo } from '@/lib/utils';
import { getGravatarUrl } from '@/lib/gravatar';
import type { Comment, TeamMember } from '@/types';

/**
 * One chat in the Chat tab: who you are talking to, the conversation, and what
 * pressing Send will do. The full ticket page is a link away for anything this
 * doesn't do (tags, fields, merge).
 */
export function ChatConversation({ brandId, ticketId }: { brandId: string; ticketId: string }) {
  const { data: ticket, isLoading: ticketLoading } = useTicket(brandId, ticketId, { polling: true });
  const { data: comments, isLoading: commentsLoading } = useComments(brandId, ticketId, { polling: true, live: true });
  const { data: teamData } = useTeamMembers({ brandId });
  // The same query key the visitor panel uses, so this costs no extra request.
  const { data: visitor } = useChatVisitor(brandId, ticketId, true);
  const updateTicket = useUpdateTicket(brandId, ticketId);
  const typing = useVisitorTyping(ticketId);
  const router = useRouter();
  const { session } = useAuth();

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

  const members: TeamMember[] = teamData?.members || [];
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

  const setStatus = async (status: 'resolved' | 'open', done: string) => {
    try {
      await updateTicket.mutateAsync({ status });
      toast.success(`${done} #${ticket.ticketNumber}`);
    } catch {
      toast.error(`Failed to ${done.toLowerCase()}`);
    }
  };

  /**
   * Take the chat, but only if nobody else has.
   *
   * `ifUnassigned` makes this one conditional UPDATE in the API rather than a
   * read and a write, so two agents reaching for the same waiting chat cannot
   * both believe they got it: the loser gets a 409 naming the winner. The chat
   * queue is exactly where that race happens.
   */
  const claim = async () => {
    if (!session?.memberId) return;
    try {
      await updateTicket.mutateAsync({ assigneeId: session.memberId, ifUnassigned: true });
      toast.success(`You have #${ticket.ticketNumber}`);
    } catch (err) {
      const held = isAxiosError(err) && err.response?.status === 409
        ? (err.response?.data?.assigneeId as string | undefined)
        : undefined;
      if (held) {
        toast.error(`${memberName(held, members) ?? 'Someone else'} got there first`);
        return;
      }
      toast.error('Failed to assign');
    }
  };

  const who = chatWho(ticket);
  const open = !['resolved', 'closed'].includes(String(ticket.status));
  const delivery = chatDelivery(ticket, visitor);
  const assignee = ticket.assigneeId ? memberName(ticket.assigneeId, members) : null;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3">
          <PersonAvatar
            name={who}
            imageUrl={ticket.customer?.avatarUrl || (ticket.customer?.email ? getGravatarUrl(ticket.customer.email, 40) : undefined)}
            size="lg"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-medium">{who}</h2>
              {visitor?.verified && (
                <Badge className="bg-success hover:bg-success shrink-0 text-white">Verified</Badge>
              )}
            </div>
            {/* Presence first: it is the one fact that changes what the reply
                box does. The subject still rides along -- it is what the queue
                row showed and what the ticket is called. */}
            <p className="text-muted-foreground truncate text-xs">
              {visitor && (
                <>
                  <span
                    className={cn(
                      'mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle',
                      visitor.present ? 'bg-success' : 'bg-subtle',
                    )}
                    aria-hidden="true"
                  />
                  {visitor.present ? 'On the page now' : `Left ${formatTimeAgo(visitor.lastSeenAt)}`}
                  {' · '}
                </>
              )}
              #{ticket.ticketNumber}
              {ticket.title ? ` · ${ticket.title}` : ''}
            </p>
          </div>
          <WaitingBadge ticket={ticket} />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Who has it, or the one press that takes it. Naming the holder
                matters more here than on the queue row: this is the chat you
                are about to start typing into. */}
            {assignee ? (
              <span className="text-muted-foreground hidden text-xs sm:inline">{assignee}</span>
            ) : (
              session?.memberId && (
                <Button size="sm" variant="outline" onClick={claim} disabled={updateTicket.isPending}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Assign to me
                </Button>
              )
            )}
            {/* Converted, it leaves this queue: carry on from the ticket page. */}
            <ConvertChatButton
              brandId={brandId}
              ticket={ticket}
              onConverted={() => router.push(`/brands/${brandId}/tickets/${ticketId}`)}
            />
            {open ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus('resolved', 'Resolved')}
                disabled={updateTicket.isPending}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Resolve
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus('open', 'Reopened')}
                disabled={updateTicket.isPending}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Reopen
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
          <ChatThread
            comments={thread}
            isLoading={commentsLoading}
            brandId={brandId}
            customer={ticket.customer}
            teamMembers={members}
          />
          {typing && (
            <p className="text-muted-foreground mt-3 text-sm italic" aria-live="polite">
              {who} is typing…
            </p>
          )}
        </div>

        <div className="bg-background border-t p-4">
          <DeliveryNotice delivery={delivery} resolved={!open} who={who} />
          {/* Keyed so a switch starts a clean draft and re-focuses. */}
          <CommentEditor
            key={ticketId}
            brandId={brandId}
            ticketId={ticketId}
            chat
            sendLabel={sendLabelFor(delivery)}
          />
        </div>
      </div>

      <aside className="bg-canvas hidden w-72 shrink-0 overflow-y-auto border-l p-4 xl:block">
        <TicketChatSection brandId={brandId} ticketId={ticketId} isChat converted={!!ticket.chatConvertedAt} />
      </aside>
    </div>
  );
}

function memberName(memberId: string, members: TeamMember[]): string | null {
  const member = members.find((m) => m.id === memberId);
  if (!member) return null;
  return [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || null;
}

/**
 * What pressing Send will do, said where the deciding happens.
 *
 * The visitor panel says the same thing, but it is a column away and hidden
 * below 1280px, and an agent about to type is looking at the box, not the
 * rail. Nothing shows when the visitor is on the page: that is the case the
 * reply box already implies, and a banner that is always there stops being
 * read.
 */
function DeliveryNotice({ delivery, resolved, who }: { delivery: ChatDelivery; resolved: boolean; who: string }) {
  const lines: string[] = [];

  if (delivery.via === 'email') {
    lines.push(
      delivery.converted
        ? `Turned into a ticket: your reply is emailed to ${delivery.email}, not sent to their chat.`
        : `${who} isn't on the page. Your reply is emailed to ${delivery.email}, and waits in the chat for when they come back.`,
    );
  } else if (delivery.via === 'none') {
    if (delivery.why === 'unconfirmed') {
      lines.push('They typed an address but haven’t confirmed it, so nothing is emailed yet. Your reply waits in the chat.');
    } else if (delivery.why === 'opted-out') {
      lines.push('They have turned off email for this ticket. Your reply waits in the chat for when they come back.');
    } else {
      lines.push(
        `${who} isn't on the page and hasn't given an address we can use, so your reply isn't emailed. It waits in the chat for when they come back.`,
      );
    }
  }

  // Resolve is a status, not a door: a reply does not reopen the ticket (see
  // CommentsService, which only changes status when one is asked for). So say
  // what Reopen is for instead of implying the reply does it.
  if (resolved) lines.push('This chat is resolved. Replying won’t reopen it — use Reopen for that.');

  if (lines.length === 0) return null;

  return (
    <p className="bg-info-soft text-info mb-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
      <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{lines.join(' ')}</span>
    </p>
  );
}
