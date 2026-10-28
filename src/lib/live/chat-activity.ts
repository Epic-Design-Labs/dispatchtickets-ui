import { useSyncExternalStore } from 'react';

/**
 * Per-tab chat activity fed by the live stream (LiveTicketEvents): which
 * visitors are typing, which chats have visitor messages the agent hasn't
 * looked at, and which chat the agent is looking at right now.
 *
 * Client-only and deliberately forgetful. Unread resets on reload; the
 * server-side truth for "someone is waiting" is awaitingReplySince.
 */

// The widget sends typing at most every 3s while keys are pressed, and a
// final `false` on send. Past this, a missed `false` stops claiming typing.
const TYPING_TTL_MS = 6000;

const typing = new Map<string, ReturnType<typeof setTimeout>>();
let unread = new Set<string>();
let viewing: string | null = null;
let version = 0;
const listeners = new Set<() => void>();

function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getVersion = () => version;

export function setVisitorTyping(ticketId: string, isTyping: boolean) {
  const existing = typing.get(ticketId);
  if (existing) clearTimeout(existing);
  if (isTyping) {
    typing.set(
      ticketId,
      setTimeout(() => {
        typing.delete(ticketId);
        changed();
      }, TYPING_TTL_MS),
    );
  } else {
    typing.delete(ticketId);
  }
  changed();
}

/** Returns false when the agent is already looking at it, so nothing to flag. */
export function markChatUnread(ticketId: string): boolean {
  // A message that arrives also means the visitor stopped typing.
  if (typing.has(ticketId)) setVisitorTyping(ticketId, false);
  if (viewing === ticketId) return false;
  if (!unread.has(ticketId)) {
    unread = new Set(unread).add(ticketId);
    changed();
  }
  return true;
}

/** The chat open in the Chat tab; null when none (or the tab is closed). */
export function setViewingChat(ticketId: string | null) {
  viewing = ticketId;
  if (ticketId && unread.has(ticketId)) {
    unread = new Set(unread);
    unread.delete(ticketId);
  }
  changed();
}

export function isViewingChat(ticketId: string): boolean {
  return viewing === ticketId;
}

export function useVisitorTyping(ticketId: string | null | undefined): boolean {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return !!ticketId && typing.has(ticketId);
}

export function useUnreadChats(): ReadonlySet<string> {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return unread;
}
