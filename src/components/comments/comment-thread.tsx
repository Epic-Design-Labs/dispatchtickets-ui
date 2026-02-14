'use client';

import { Comment, Customer, TeamMember } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { getGravatarUrl } from '@/lib/gravatar';

interface CommentThreadProps {
  comments: Comment[];
  isLoading?: boolean;
  brandId?: string;
  customer?: Customer;
  teamMembers?: TeamMember[];
}

export function CommentThread({ comments, isLoading, brandId, customer, teamMembers = [] }: CommentThreadProps) {
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
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg
          className="mb-2 h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-muted-foreground">No comments yet</p>
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
    return comment.authorId || 'Customer';
  };

  const getAuthorInitial = (comment: Comment) => {
    // Use initials from author name if available
    const authorName = comment.metadata?.authorName as string | undefined;
    if (authorName) {
      return authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    // Fall back to type-based initials
    if (comment.authorType === 'AGENT') return 'A';
    if (comment.authorType === 'SYSTEM') return 'S';
    // Use customer name/email initial if available
    if (customer?.name) return customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (customer?.email) return customer.email[0].toUpperCase();
    return 'C';
  };

  const isInternal = (comment: Comment) => {
    return comment.metadata?.isInternal === true;
  };

  // Show newest comments first
  const sortedComments = [...comments].reverse();

  return (
    <div className="space-y-4">
      {sortedComments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={getAuthorAvatarUrl(comment)} alt={getAuthorLabel(comment)} />
            <AvatarFallback
              className={
                comment.authorType === 'AGENT'
                  ? 'bg-blue-100 text-blue-700'
                  : comment.authorType === 'SYSTEM'
                    ? 'bg-gray-100 text-gray-700'
                    : ''
              }
            >
              {getAuthorInitial(comment)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{getAuthorLabel(comment)}</span>
              {isInternal(comment) && (
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">
                  Internal
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <MarkdownContent
              content={comment.body}
              className="mt-1 text-sm"
              skipSignatureDetection={comment.authorType === 'SYSTEM'}
              brandId={brandId}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
