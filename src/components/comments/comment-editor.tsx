'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateComment, useProfile, useUploadAttachment } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { toast } from 'sonner';
import { Send, Clock, CheckCircle, ImagePlus, Loader2 } from 'lucide-react';

interface CommentEditorProps {
  brandId: string;
  ticketId: string;
}

type SubmitAction = 'comment' | 'pending' | 'resolved';

export function CommentEditor({ brandId, ticketId }: CommentEditorProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createComment = useCreateComment(brandId, ticketId);
  const uploadAttachment = useUploadAttachment(brandId, ticketId);
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

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const attachment = await uploadAttachment.mutateAsync(file);
      // Insert markdown image at cursor position
      const imageMarkdown = `![${file.name}](${attachment.downloadUrl})`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newBody = body.slice(0, start) + imageMarkdown + body.slice(end);
        setBody(newBody);
        // Move cursor after the inserted image
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + imageMarkdown.length;
          textarea.focus();
        }, 0);
      } else {
        setBody((prev) => prev + (prev ? '\n' : '') + imageMarkdown);
      }
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [body, uploadAttachment]);

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleImageUpload]);

  // Handle paste for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(file);
        }
        return;
      }
    }
  }, [handleImageUpload]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Add a comment... (paste images directly)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onPaste={handlePaste}
          disabled={createComment.isPending || isUploading}
        />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Uploading image...</span>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-muted-foreground">Internal note</span>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Add image"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit('pending')}
            disabled={createComment.isPending || !body.trim()}
            title={`Add & Pending (${modKey}+Shift+P)`}
          >
            <Clock className="mr-2 h-4 w-4" />
            Pending
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit('resolved')}
            disabled={createComment.isPending || !body.trim()}
            title={`Add & Resolve (${modKey}+Shift+R)`}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Resolve
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit('comment')}
            disabled={createComment.isPending || !body.trim()}
            title={`Add Comment (${modKey}+Enter)`}
          >
            <Send className="mr-2 h-4 w-4" />
            {createComment.isPending ? 'Adding...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
