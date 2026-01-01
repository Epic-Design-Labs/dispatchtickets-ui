'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateComment, useProfile } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { toast } from 'sonner';

interface CommentEditorProps {
  workspaceId: string;
  ticketId: string;
}

export function CommentEditor({ workspaceId, ticketId }: CommentEditorProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const createComment = useCreateComment(workspaceId, ticketId);
  const { session } = useAuth();
  const { data: profile } = useProfile();

  // Get author name: profile > email-derived
  const getAuthorName = () => {
    // Use profile display name if set
    if (profile?.displayName) {
      return profile.displayName;
    }
    // Fall back to deriving from email
    if (!session?.email) return undefined;
    const namePart = session.email.split('@')[0];
    return namePart
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      const authorName = getAuthorName();
      await createComment.mutateAsync({
        body: body.trim(),
        authorType: 'AGENT',
        authorName,
        metadata: {
          ...(isInternal && { isInternal: true }),
          ...(authorName && { authorName }),
        },
      });
      setBody('');
      setIsInternal(false);
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Add a comment..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={createComment.isPending}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-muted-foreground">Internal note (not visible to customer)</span>
        </label>
        <Button type="submit" disabled={createComment.isPending || !body.trim()}>
          {createComment.isPending ? 'Adding...' : 'Add Comment'}
        </Button>
      </div>
    </form>
  );
}
