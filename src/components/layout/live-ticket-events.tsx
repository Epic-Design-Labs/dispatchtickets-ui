'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { ticketKeys } from '@/lib/hooks/use-tickets';
import { commentKeys } from '@/lib/hooks/use-comments';
import { presenceKeys } from '@/lib/hooks/use-presence';
import { sendDesktopNotification } from '@/lib/hooks/use-global-ticket-notifications';
import { setLiveConnected } from '@/lib/live/live-state';
import { playChime } from '@/lib/live/chime';
import { markChatUnread, setVisitorTyping } from '@/lib/live/chat-activity';

const MAX_BACKOFF_MS = 60_000;

interface TicketCreated {
  id: string;
  brandId: string;
  ticketNumber: number;
  title: string;
  source: string;
  body?: string;
}

interface AwaitingReply {
  id: string;
  brandId: string;
  publicId: string;
  title: string;
  level: 'warning' | 'critical';
  awaitingReplySince: string;
  waitingSeconds: number;
}

interface ChatTyping {
  ticketId: string;
  typing: boolean;
}

/** Chat alerts open the Chat tab on that conversation. */
const chatUrl = (brandId: string, ticketId: string) => `/brands/${brandId}/chat?t=${ticketId}`;

interface CommentCreated {
  brandId: string;
  ticketId: string;
  comment: { id: string; authorType: string; source: string; isInternal: boolean; body?: string };
}

/**
 * One account-wide event stream per tab (GET /stream): instant alerts for
 * chats, and instant refresh of ticket lists and open conversations for
 * everything. The server only sends events for brands this user can access.
 *
 * Stream tokens are single-use, so EventSource's own reconnect (same URL)
 * can't work: reconnects are ours, each with a fresh token and the last
 * event id so nothing in the gap is missed. If the stream can't be had
 * (429, 503), the 2-minute poller keeps covering chats, as it always has.
 */
export function LiveTicketEvents() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    let lastEventId: string | undefined;
    let stopped = false;
    const alerted = new Set<string>();
    // One toggle writes a row per brand, so presence.changed arrives in bursts:
    // refetch once per burst, not once per brand.
    let presenceTimer: ReturnType<typeof setTimeout> | null = null;

    const brandName = (brandId: string) =>
      queryClient.getQueryData<{ id: string; name: string }[]>(['brands'])?.find((b) => b.id === brandId)?.name;

    const alert = (key: string, title: string, body: string, url: string) => {
      if (alerted.has(key)) return;
      alerted.add(key);
      toast.info(title, {
        description: body,
        action: { label: 'Open', onClick: () => router.push(url) },
        duration: 10_000,
      });
      sendDesktopNotification(title, body, () => router.push(url));
      playChime();
    };

    const schedule = () => {
      failures += 1;
      const delay = Math.min(1000 * 2 ** (failures - 1), MAX_BACKOFF_MS);
      timer = setTimeout(connect, delay);
    };

    const onTicketCreated = (e: MessageEvent) => {
      if (e.lastEventId) lastEventId = e.lastEventId;
      const t = JSON.parse(e.data) as TicketCreated;
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(t.brandId) });
      if (t.source !== 'chat') return;
      markChatUnread(t.id);
      const where = brandName(t.brandId);
      alert(
        `ticket:${t.id}`,
        where ? `New chat on ${where}` : 'New chat',
        (t.body || t.title || '').slice(0, 140),
        chatUrl(t.brandId, t.id),
      );
    };

    const onCommentCreated = (e: MessageEvent) => {
      if (e.lastEventId) lastEventId = e.lastEventId;
      const c = JSON.parse(e.data) as CommentCreated;
      queryClient.invalidateQueries({ queryKey: commentKeys.all(c.brandId, c.ticketId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(c.brandId, c.ticketId) });
      const fromVisitor = c.comment.source === 'chat' && c.comment.authorType === 'CUSTOMER';
      if (!fromVisitor) return;
      // Already looking at it (Chat tab or ticket page): the conversation just
      // refreshed, no need to shout.
      if (!markChatUnread(c.ticketId) || pathRef.current?.includes(c.ticketId)) return;
      alert(
        `comment:${c.comment.id}`,
        'New chat message',
        (c.comment.body || '').slice(0, 140),
        chatUrl(c.brandId, c.ticketId),
      );
    };

    // The API decides when a wait has gone on too long (reply-state.ts); this
    // only refreshes the badges and says so. Alerts even on the ticket's own
    // page: being there and not answering is exactly the case to flag.
    const onAwaitingReply = (e: MessageEvent) => {
      if (e.lastEventId) lastEventId = e.lastEventId;
      const w = JSON.parse(e.data) as AwaitingReply;
      queryClient.invalidateQueries({ queryKey: ticketKeys.all(w.brandId) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(w.brandId, w.id) });
      const minutes = Math.max(1, Math.floor(w.waitingSeconds / 60));
      const where = brandName(w.brandId);
      alert(
        `wait:${w.id}:${w.awaitingReplySince}:${w.level}`,
        `${w.level === 'critical' ? 'Chat still unanswered' : 'Chat waiting'}: ${minutes} min${where ? ` on ${where}` : ''}`,
        `${w.publicId} · ${(w.title || '').slice(0, 120)}`,
        chatUrl(w.brandId, w.id),
      );
    };

    async function connect() {
      if (stopped) return;
      let url: string;
      try {
        const { data } = await apiClient.post<{ token: string }>('/stream/token');
        const q = new URLSearchParams({ token: data.token });
        if (lastEventId) q.set('lastEventId', lastEventId);
        url = `${apiClient.defaults.baseURL}/stream?${q}`;
      } catch {
        schedule();
        return;
      }
      if (stopped) return;

      const es = new EventSource(url);
      source = es;
      es.onopen = () => {
        failures = 0;
        setLiveConnected(true);
      };
      es.onerror = () => {
        if (source !== es) return;
        es.close();
        source = null;
        setLiveConnected(false);
        if (!stopped) schedule();
      };
      es.addEventListener('ticket.created', onTicketCreated as EventListener);
      es.addEventListener('ticket.comment.created', onCommentCreated as EventListener);
      es.addEventListener('ticket.awaiting_reply', onAwaitingReply as EventListener);
      es.addEventListener('chat.typing', (e: MessageEvent) => {
        if (e.lastEventId) lastEventId = e.lastEventId;
        const t = JSON.parse(e.data) as ChatTyping;
        setVisitorTyping(t.ticketId, t.typing);
      });
      es.addEventListener('presence.changed', (e: MessageEvent) => {
        if (e.lastEventId) lastEventId = e.lastEventId;
        if (presenceTimer) return;
        presenceTimer = setTimeout(() => {
          presenceTimer = null;
          queryClient.invalidateQueries({ queryKey: presenceKeys.all });
        }, 500);
      });
      es.addEventListener('unauthorized', () => {
        es.close();
        source = null;
        setLiveConnected(false);
      });
    }

    void connect();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (presenceTimer) clearTimeout(presenceTimer);
      source?.close();
      setLiveConnected(false);
    };
  }, [queryClient, router]);

  return null;
}
