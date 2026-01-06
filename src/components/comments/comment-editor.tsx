'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateComment, useProfile, useUploadAttachment } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { toast } from 'sonner';
import { Send, Clock, CheckCircle, ImagePlus, Paperclip, Loader2, X, FileText } from 'lucide-react';

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
  const imageInputRef = useRef<HTMLInputElement>(null);
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

  // Handle file upload (images or attachments)
  const handleFileUpload = useCallback(async (file: File, forceAsAttachment = false) => {
    const isImage = file.type.startsWith('image/') && !forceAsAttachment;

    setIsUploading(true);
    try {
      const attachment = await uploadAttachment.mutateAsync(file);
      // Insert markdown: image syntax for images, link syntax for files
      const markdown = isImage
        ? `![${file.name}](${attachment.downloadUrl})`
        : `[${file.name}](${attachment.downloadUrl})`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newBody = body.slice(0, start) + markdown + body.slice(end);
        setBody(newBody);
        // Move cursor after the inserted content
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + markdown.length;
          textarea.focus();
        }, 0);
      } else {
        setBody((prev) => prev + (prev ? '\n' : '') + markdown);
      }
      toast.success(isImage ? 'Image uploaded' : 'File attached');
    } catch {
      toast.error(isImage ? 'Failed to upload image' : 'Failed to attach file');
    } finally {
      setIsUploading(false);
    }
  }, [body, uploadAttachment]);

  // Handle image input change
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      handleFileUpload(file);
    }
    e.target.value = '';
  }, [handleFileUpload]);

  // Handle file input change (any file type)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, true);
    }
    e.target.value = '';
  }, [handleFileUpload]);

  // Handle paste for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileUpload(file);
        }
        return;
      }
    }
  }, [handleFileUpload]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  // Extract images from markdown body for preview
  const images = useMemo(() => {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches: { alt: string; url: string; fullMatch: string }[] = [];
    let match;
    while ((match = imageRegex.exec(body)) !== null) {
      matches.push({
        alt: match[1],
        url: match[2],
        fullMatch: match[0],
      });
    }
    return matches;
  }, [body]);

  // Extract file attachments (non-image links) from markdown body for preview
  const attachments = useMemo(() => {
    // Match [text](url) but NOT ![text](url)
    const linkRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
    const matches: { name: string; url: string; fullMatch: string }[] = [];
    let match;
    while ((match = linkRegex.exec(body)) !== null) {
      // Only include if it looks like a storage URL (R2/S3)
      if (match[2].includes('r2.cloudflarestorage.com') || match[2].includes('X-Amz-')) {
        matches.push({
          name: match[1],
          url: match[2],
          fullMatch: match[0],
        });
      }
    }
    return matches;
  }, [body]);

  // Remove an attachment from the body
  const removeAttachment = useCallback((fullMatch: string) => {
    setBody((prev) => {
      // Remove the markdown and any trailing newline
      return prev.replace(fullMatch + '\n', '').replace(fullMatch, '').trim();
    });
  }, []);

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
            <span className="ml-2 text-sm text-muted-foreground">Uploading...</span>
          </div>
        )}
      </div>
      {/* Image and attachment previews */}
      {(images.length > 0 || attachments.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, index) => (
            <div key={`img-${index}`} className="relative group">
              <img
                src={img.url}
                alt={img.alt || 'Uploaded image'}
                className="h-20 w-20 object-cover rounded-md border"
              />
              <button
                type="button"
                onClick={() => removeAttachment(img.fullMatch)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {attachments.map((file, index) => (
            <div key={`file-${index}`} className="relative group flex items-center gap-2 px-3 py-2 bg-muted rounded-md border">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate max-w-[150px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(file.fullMatch)}
                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
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
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
            title="Add image"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
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
