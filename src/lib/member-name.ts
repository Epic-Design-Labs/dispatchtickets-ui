import type { TeamMember } from '@/types';

/**
 * A member id turned into something sayable.
 *
 * Shared because two surfaces now name the agent who won a race for the same
 * ticket -- the chat pane and the queue rows -- and a 409 that says "Dana got
 * there first" in one place and "someone else" in the other reads like two
 * different systems.
 *
 * Null when the id is not in the roster: the queues hold tickets from every
 * brand, and an assignee can be someone whose brand access was since removed.
 * The caller says "someone else" rather than printing a raw id.
 */
export function memberName(memberId: string, members: TeamMember[] | undefined): string | null {
  const member = members?.find((m) => m.id === memberId);
  if (!member) return null;
  return [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || null;
}
