'use client';

import { MessageSquare } from 'lucide-react';
import { Comment, Contact, TeamMember } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { PersonAvatar } from '@/components/person-avatar';
import { Pill } from '@/components/tickets/pill';
import { getGravatarUrl } from '@/lib/gravatar';

interface CommentThreadProps {
  comments: Comment[];
  isLoading?: boolean;
  brandId?: string;
  customer?: Contact;
  teamMembers?: TeamMember[];
  /** 'newest' (default) puts the latest on top; a chat reads 'oldest' first. */
  order?: 'newest' | 'oldest';
}

export function CommentThread({ comments, isLoading, brandId, customer, teamMembers = [], order = 'newest' }: CommentThreadProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <span className="bg-brand-soft text-brand grid h-11 w-11 place-items-center rounded-xl">
          <MessageSquare className="h-5 w-5" />
        </span>
        <p className="text-muted-foreground text-sm">No replies yet</p>
      </div>
    );
  }

  const findMemberForComment = (comment: Comment): TeamMember | undefined => {
    if (comment.authorType !== 'AGENT') return undefined;
    // Match by authorId first
    if (comment.authorId) {
      const byId = teamMembers.find(m => m.id === comment.authorId);
      if (byId) return byId;
    }
    // Match by authorName in metadata
    const authorName = comment.metadata?.authorName as string | undefined;
    if (authorName) {
      return teamMembers.find(m => {
        const fullName = [m.firstName, m.lastName].filter(Boolean).join(' ');
        return fullName === authorName || m.firstName === authorName || m.email === authorName;
      });
    }
    return undefined;
  };

  const getAuthorAvatarUrl = (comment: Comment): string | undefined => {
    if (comment.authorType === 'AGENT') {
      const member = findMemberForComment(comment);
      if (member?.avatarUrl) return member.avatarUrl;
      if (member?.email) return getGravatarUrl(member.email, 32);
      return undefined;
    }
    if (comment.authorType === 'CUSTOMER') {
      if (customer?.avatarUrl) return customer.avatarUrl;
      if (customer?.email) return getGravatarUrl(customer.email, 32);
      return undefined;
    }
    return undefined;
  };

  const getAuthorLabel = (comment: Comment) => {
    // Check for author name in metadata
    const authorName = comment.metadata?.authorName as string | undefined;
    if (authorName) return authorName;

    // Fall back to type-based labels
    if (comment.authorType === 'AGENT') return 'Agent';
    if (comment.authorType === 'SYSTEM') return 'System';
    // Use customer name or email if available
    if (customer?.name) return customer.name;
    if (customer?.email) return customer.email;
    return comment.authorId || 'Contact';
  };

  const isInternal = (comment: Comment) => {
    return comment.metadata?.isInternal === true;
  };

  const sortedComments = order === 'newest' ? [...comments].reverse() : comments;

  return (
    <div className="space-y-4">
      {sortedComments.map((comment) => {
        const label = getAuthorLabel(comment);
        const internal = isInternal(comment);
        const system = comment.authorType === 'SYSTEM';
        // Three kinds of message, told apart by their fill rather than by a
        // label someone has to read: a note the customer will never see is
        // amber, our own reply carries the brand violet, and what the customer
        // wrote sits plain on the page. A chat reply is one of ours too.
        const tone = internal ? 'note' : !system && comment.authorType === 'AGENT' ? 'reply' : 'plain';

        return (
          <div
            key={comment.id}
            className="flex gap-3 border-t pt-4 first:border-t-0 first:pt-0"
          >
            <PersonAvatar name={label} imageUrl={getAuthorAvatarUrl(comment)} system={system} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{label}</span>
                {comment.metadata?.isTicketBody === true && (
                  <Pill dot={false} className="bg-info-soft text-info">
                    {comment.metadata?.isConvertedDescription === true ? 'Turned into ticket' : 'Original request'}
                  </Pill>
                )}
                {comment.metadata?.chatOpeningMessage === true && (
                  <Pill dot={false} className="bg-info-soft text-info">
                    Chat started
                  </Pill>
                )}
                {internal && (
                  <Pill dot={false} className="bg-warning-soft text-warning-foreground">
                    Internal note
                  </Pill>
                )}
                <span className="text-subtle text-xs">{formatDateTime(comment.createdAt)}</span>
              </div>
              <MarkdownContent
                content={comment.body}
                className={cn(
                  'text-sm',
                  // w-fit so a one-line reply hugs its text instead of
                  // painting a full-width slab, as the design has it.
                  tone === 'note' && 'bg-warning-soft border-warning/25 w-fit max-w-full rounded-lg border px-3 py-2',
                  tone === 'reply' && 'bg-brand-soft border-brand-softer w-fit max-w-full rounded-lg border px-3 py-2',
                  system && 'text-muted-foreground'
                )}
                skipSignatureDetection={system}
                brandId={brandId}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
