'use client';

import { Suspense, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChatList } from '@/components/chat/chat-list';
import { ChatConversation } from '@/components/chat/chat-conversation';
import { useBrand } from '@/lib/hooks';
import { useChatQueue } from '@/lib/hooks/use-chat';
import { setViewingChat } from '@/lib/live/chat-activity';
import { cn } from '@/lib/utils';

const TICKET_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The Chat tab: open chats on the left, longest-waiting first, and the
 * selected conversation on the right. Selection is ?t= so alerts can deep-link
 * and switching never leaves the page.
 */
export default function ChatPage() {
  return (
    <Suspense>
      <ChatWorkspace />
    </Suspense>
  );
}

function ChatWorkspace() {
  const params = useParams();
  const brandId = params.brandId as string;
  const router = useRouter();
  // ?t= arrives from links, and it becomes a path segment in API calls made
  // with the agent's session: only a ticket-id shape is accepted.
  const rawSelected = useSearchParams().get('t');
  const selectedId = rawSelected && TICKET_ID.test(rawSelected) ? rawSelected : null;
  const { data: brand } = useBrand(brandId);
  const { data, isLoading } = useChatQueue(brandId);
  const tickets = useMemo(() => data?.data ?? [], [data]);

  // Land on the longest-waiting chat rather than an empty pane (wide screens
  // only: on a phone the list is the landing view).
  const firstId = tickets[0]?.id;
  useEffect(() => {
    if (selectedId || !firstId || !window.matchMedia('(min-width: 768px)').matches) return;
    router.replace(`/brands/${brandId}/chat?t=${firstId}`, { scroll: false });
  }, [selectedId, firstId, brandId, router]);

  // Alt+Up / Alt+Down move through the list. Not J/K: the reply box keeps
  // focus here, so plain letters belong to the reply.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || tickets.length === 0) return;
      e.preventDefault();
      const ordered = [...tickets.filter((t) => t.awaitingReplySince), ...tickets.filter((t) => !t.awaitingReplySince)];
      const at = ordered.findIndex((t) => t.id === selectedId);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = ordered[(at + step + ordered.length) % ordered.length] ?? ordered[0];
      router.replace(`/brands/${brandId}/chat?t=${next.id}`, { scroll: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tickets, selectedId, brandId, router]);

  // Tells the live stream which chat needs no alert or unread dot.
  useEffect(() => {
    setViewingChat(selectedId);
    return () => setViewingChat(null);
  }, [selectedId]);

  if (brand && !brand.chatEnabled && !isLoading && tickets.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Live chat isn&apos;t turned on for this brand.</p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/brands/${brandId}/settings/channels`}>Set up chat</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div
        className={cn(
          'w-full shrink-0 overflow-y-auto border-r bg-gray-50 md:w-80',
          selectedId && 'hidden md:block',
        )}
      >
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <ChatList brandId={brandId} tickets={tickets} selectedId={selectedId} />
        )}
      </div>

      <div className={cn('min-w-0 flex-1 flex-col', selectedId ? 'flex' : 'hidden md:flex')}>
        {selectedId ? (
          <>
            <Link
              href={`/brands/${brandId}/chat`}
              className="flex items-center gap-1 border-b bg-background px-4 py-2 text-sm text-muted-foreground md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              All chats
            </Link>
            <div className="min-h-0 flex-1">
              <ChatConversation brandId={brandId} ticketId={selectedId} />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {isLoading ? null : 'Pick a chat to reply.'}
          </div>
        )}
      </div>
    </div>
  );
}
