'use client';

import { Suspense, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatList } from '@/components/chat/chat-list';
import { ChatConversation } from '@/components/chat/chat-conversation';
import { BrandTile } from '@/components/brand-tile';
import { useGlobalChatQueue } from '@/lib/hooks/use-chat';
import { setViewingChat } from '@/lib/live/chat-activity';
import { cn } from '@/lib/utils';
import type { BrandInfo } from '@/types';

const TICKET_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Every live chat the signed-in member can reach, in one queue.
 *
 * The per-brand Chat tab still exists and is unchanged; this is the view for
 * someone covering several brands, where a visitor waiting on brand C is
 * otherwise invisible while you are reading brand A. Which brands appear is
 * decided by the API (`memberBrandScope`), not here -- same scoping as every
 * other cross-brand page.
 */
export default function GlobalChatPage() {
  return (
    <Suspense>
      <GlobalChatWorkspace />
    </Suspense>
  );
}

function GlobalChatWorkspace() {
  const router = useRouter();
  // ?t= arrives from links, and it becomes a path segment in API calls made
  // with the agent's session: only a ticket-id shape is accepted.
  const rawSelected = useSearchParams().get('t');
  const selectedId = rawSelected && TICKET_ID.test(rawSelected) ? rawSelected : null;

  const { data, isLoading } = useGlobalChatQueue();
  const tickets = useMemo(() => data?.data ?? [], [data]);

  // The conversation pane needs the chat's own brand. It comes from the
  // queue rather than the URL, which is why a chat that has left the queue
  // (converted to a ticket, closed) gets its own message below instead of a
  // broken pane.
  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId]
  );

  // Land on the longest-waiting chat rather than an empty pane (wide screens
  // only: on a phone the list is the landing view).
  const firstId = tickets[0]?.id;
  useEffect(() => {
    if (selectedId || !firstId || !window.matchMedia('(min-width: 768px)').matches) return;
    router.replace(`/chat?t=${firstId}`, { scroll: false });
  }, [selectedId, firstId, router]);

  // Alt+Up / Alt+Down stepping through the queue lives in ChatList, which is
  // the only place that knows the order actually on screen once its search
  // has narrowed the list.

  // Tells the live stream which chat needs no alert or unread dot.
  useEffect(() => {
    setViewingChat(selectedId);
    return () => setViewingChat(null);
  }, [selectedId]);

  const brand = (selected as (typeof tickets)[number] & { brand?: BrandInfo } | null)?.brand;

  return (
    <div className="flex h-full min-h-0">
      <div
        className={cn(
          'bg-canvas w-full shrink-0 overflow-y-auto border-r md:w-80',
          selectedId && 'hidden md:block'
        )}
      >
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <ChatList
            tickets={tickets}
            selectedId={selectedId}
            hrefFor={(t) => `/chat?t=${t.id}`}
            showBrand
          />
        )}
      </div>

      <div className={cn('min-w-0 flex-1 flex-col', selectedId ? 'flex' : 'hidden md:flex')}>
        {selectedId ? (
          <>
            <Link
              href="/chat"
              className="bg-background text-muted-foreground flex items-center gap-1 border-b px-4 py-2 text-sm md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              All chats
            </Link>
            {selected ? (
              <>
                {brand && (
                  <div className="bg-background text-muted-foreground flex items-center gap-2 border-b px-4 py-2 text-xs">
                    <BrandTile name={brand.name} iconUrl={brand.iconUrl} size="sm" />
                    <Link href={`/brands/${brand.id}/chat`} className="hover:underline">
                      {brand.name}
                    </Link>
                  </div>
                )}
                <div className="min-h-0 flex-1">
                  <ChatConversation brandId={selected.brandId} ticketId={selected.id} />
                </div>
              </>
            ) : isLoading ? null : (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
                <MessageSquare className="h-8 w-8" />
                <p>That chat is no longer in the queue — it may have been turned into a ticket or closed.</p>
                <Link href="/chat" className="text-primary hover:underline">
                  Back to all chats
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {isLoading ? null : 'Pick a chat to reply.'}
          </div>
        )}
      </div>
    </div>
  );
}
