'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateComment } from '@/lib/hooks';
import { toast } from 'sonner';

interface CommentEditorProps {
  workspaceId: string;
  ticketId: string;
}

export function CommentEditor({ workspaceId, ticketId }: CommentEditorProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const createComment = useCreateComment(workspaceId, ticketId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      await createComment.mutateAsync({
        body: body.trim(),
        authorType: 'AGENT',
        metadata: isInternal ? { isInternal: true } : undefined,
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
