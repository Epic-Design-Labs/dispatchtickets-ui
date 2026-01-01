'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { useCreateComment, useProfile } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { toast } from 'sonner';
import { ChevronDown, Send, Clock, CheckCircle } from 'lucide-react';

interface CommentEditorProps {
  workspaceId: string;
  ticketId: string;
}

type SubmitAction = 'comment' | 'pending' | 'resolved';

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

  const handleSubmit = useCallback(async (action: SubmitAction) => {
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
        ...(action !== 'comment' && { setStatus: action }),
      });
      setBody('');
      setIsInternal(false);

      const messages: Record<SubmitAction, string> = {
        comment: 'Comment added',
        pending: 'Comment added & set to Pending',
        resolved: 'Comment added & set to Resolved',
      };
      toast.success(messages[action]);
    } catch {
      toast.error('Failed to add comment');
    }
  }, [body, isInternal, createComment, profile?.displayName, session?.email]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Enter
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          // Cmd/Ctrl + Shift + P = Pending
          // Cmd/Ctrl + Shift + R = Resolved
          if (e.code === 'KeyP') {
            handleSubmit('pending');
          } else if (e.code === 'KeyR') {
            handleSubmit('resolved');
          }
        } else {
          // Cmd/Ctrl + Enter = Add Comment
          handleSubmit('comment');
        }
      } else if (isMod && e.shiftKey) {
        // Handle Shift + key shortcuts without Enter
        if (e.code === 'KeyP') {
          e.preventDefault();
          handleSubmit('pending');
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          handleSubmit('resolved');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <div className="space-y-3">
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

        <div className="flex items-center">
          {/* Main submit button */}
          <Button
            type="button"
            onClick={() => handleSubmit('comment')}
            disabled={createComment.isPending || !body.trim()}
            className="rounded-r-none"
          >
            <Send className="mr-2 h-4 w-4" />
            {createComment.isPending ? 'Adding...' : 'Add Comment'}
          </Button>

          {/* Dropdown for status actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                disabled={createComment.isPending || !body.trim()}
                className="rounded-l-none border-l-0 px-2"
                variant="default"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSubmit('comment')}>
                <Send className="mr-2 h-4 w-4" />
                Add Comment
                <DropdownMenuShortcut>{modKey}+↵</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSubmit('pending')}>
                <Clock className="mr-2 h-4 w-4" />
                Add & Pending
                <DropdownMenuShortcut>{modKey}+⇧+P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSubmit('resolved')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Add & Resolve
                <DropdownMenuShortcut>{modKey}+⇧+R</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
