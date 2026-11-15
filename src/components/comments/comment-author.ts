import { getGravatarUrl } from '@/lib/gravatar';
import type { Comment, Contact, TeamMember } from '@/types';

/**
 * Who wrote a comment, and what to draw for them.
 *
 * Extracted from CommentThread so the chat thread resolves authors the same
 * way: both render the same comments, and an agent who is a name and a face on
 * the ticket page should not become "Agent" with a grey circle in the chat.
 *
 * Comments do not store an author name (see chat.handler.ts, which can only
 * ever say the brand). What we have is an authorId that may match a team
 * member, an authorName someone put in metadata, and the ticket's contact.
 */

export interface AuthorContext {
  customer?: Contact;
  teamMembers?: TeamMember[];
}

function memberFor(comment: Comment, teamMembers: TeamMember[]): TeamMember | undefined {
  if (comment.authorType !== 'AGENT') return undefined;
  if (comment.authorId) {
    const byId = teamMembers.find((m) => m.id === comment.authorId);
    if (byId) return byId;
  }
  const authorName = comment.metadata?.authorName as string | undefined;
  if (!authorName) return undefined;
  return teamMembers.find((m) => {
    const fullName = [m.firstName, m.lastName].filter(Boolean).join(' ');
    return fullName === authorName || m.firstName === authorName || m.email === authorName;
  });
}

/** The name to show. Falls back through metadata, the contact, then the type. */
export function authorLabel(comment: Comment, { customer }: AuthorContext = {}): string {
  const authorName = comment.metadata?.authorName as string | undefined;
  if (authorName) return authorName;
  if (comment.authorType === 'AGENT') return 'Agent';
  if (comment.authorType === 'SYSTEM') return 'System';
  if (customer?.name) return customer.name;
  if (customer?.email) return customer.email;
  return comment.authorId || 'Contact';
}

/** An uploaded picture or a gravatar, when the author resolves to someone. */
export function authorAvatarUrl(
  comment: Comment,
  { customer, teamMembers = [] }: AuthorContext = {},
): string | undefined {
  if (comment.authorType === 'AGENT') {
    const member = memberFor(comment, teamMembers);
    if (member?.avatarUrl) return member.avatarUrl;
    if (member?.email) return getGravatarUrl(member.email, 32);
    return undefined;
  }
  if (comment.authorType === 'CUSTOMER') {
    if (customer?.avatarUrl) return customer.avatarUrl;
    if (customer?.email) return getGravatarUrl(customer.email, 32);
  }
  return undefined;
}

/** A note the customer will never see. */
export function isInternalNote(comment: Comment): boolean {
  return comment.metadata?.isInternal === true;
}
