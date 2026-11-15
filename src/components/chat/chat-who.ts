import type { Ticket } from '@/types';

/**
 * Who a chat is with.
 *
 * A chat visitor may be a signed-in customer the brand's own server vouched
 * for, an anonymous browser that typed a name, or nobody at all. Shared by the
 * queue and the conversation so a row and its header never disagree about who
 * you are talking to.
 *
 * Deliberately not the typed email (sourceData.claimedEmail): anyone can type
 * any address, and a header is not the place to present one as identity. The
 * visitor panel shows it, labelled as unverified.
 */
export function chatWho(ticket: Ticket): string {
  return (
    ticket.customer?.name ||
    ticket.customer?.email ||
    (ticket.customFields?.requesterName as string | undefined) ||
    'Visitor'
  );
}
