import type { ChatVisitor } from '@/lib/api/chat';
import type { Ticket } from '@/types';

/**
 * Where the next reply will actually go.
 *
 * This mirrors ChannelsService.determineReplyChannel() in the API, in its
 * order: the chat handler first (ChatChannelHandler.canSend is "is the visitor
 * here right now"), then email if there is a requester address the contact has
 * not opted out of, then nothing at all. A converted chat skips the first step
 * by design -- it is an email ticket now, even with the widget still open.
 *
 * It is about the NEXT reply, never a past one. Nothing is stored per comment
 * about how it was delivered, and presence is a 60-second window, so a line
 * under an hour-old message claiming it was emailed would be a guess dressed
 * as a receipt. "What will Send do" is answerable; "what did Send do" is not.
 */
export type ChatDelivery =
  /** Pushed onto their open conversation as soon as it is sent. */
  | { via: 'chat' }
  /** Emailed, and in the transcript for when they come back. */
  | { via: 'email'; email: string; converted: boolean }
  /** Recorded on the ticket and nothing more. `why` says what is missing. */
  | { via: 'none'; converted: boolean; why: 'absent' | 'opted-out' | 'unconfirmed' };

/** The address the API would send to: the same two places channels.service.ts reads. */
export function requesterEmailOf(ticket: Ticket): string | undefined {
  const typed = ticket.customFields?.requesterEmail;
  return ticket.customer?.email || (typeof typed === 'string' ? typed : undefined);
}

export function chatDelivery(ticket: Ticket, visitor?: ChatVisitor): ChatDelivery {
  const converted = !!ticket.chatConvertedAt;
  if (!converted && visitor?.present) return { via: 'chat' };

  const email = requesterEmailOf(ticket);
  const optedOut = ticket.customer?.notifyEmail === false;
  if (email && !optedOut) return { via: 'email', email, converted };

  // A typed address is not a requester address: conversion only ever sends it a
  // confirmation, and nothing else is emailed until they click it. Saying so is
  // more use than "no address" when an address is sitting right there.
  const awaiting = !!visitor?.emailConfirmation && !visitor.emailConfirmation.confirmedAt;
  return { via: 'none', converted, why: optedOut ? 'opted-out' : awaiting ? 'unconfirmed' : 'absent' };
}

/** What the send button should say, so the label and the banner agree. */
export function sendLabelFor(delivery: ChatDelivery): string {
  if (delivery.via === 'chat') return 'Send';
  if (delivery.via === 'email') return 'Send by email';
  return 'Send';
}
