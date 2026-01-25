'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateComment, useProfile, useUploadAttachment, useEmailConnections, useTeamMembers } from '@/lib/hooks';
import { MentionAutocomplete } from './mention-autocomplete';
import { useAuth } from '@/providers';
import { toast } from 'sonner';
import { Send, Clock, CheckCircle, ImagePlus, Paperclip, Loader2, X, FileText, Mail, Plus, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface CommentEditorProps {
  brandId: string;
  ticketId: string;
}

type SubmitAction = 'comment' | 'pending' | 'resolved';

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
}

export function CommentEditor({ brandId, ticketId }: CommentEditorProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [showCcInput, setShowCcInput] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createComment = useCreateComment(brandId, ticketId);
  const uploadAttachment = useUploadAttachment(brandId, ticketId);
  const { session } = useAuth();
  const { data: profile } = useProfile();
  const { data: emailConnections } = useEmailConnections(brandId);
  const { data: teamData } = useTeamMembers({ brandId });
  const activeMembers = useMemo(
    () => teamData?.members?.filter((m) => m.status === 'active') || [],
    [teamData?.members]
  );

  // Filter active connections
  const activeConnections = useMemo(
    () => emailConnections?.filter((c) => c.status === 'ACTIVE') || [],
    [emailConnections]
  );

  // Get selected connection (or primary/first active)
  const selectedConnection = useMemo(() => {
    if (selectedConnectionId) {
      return activeConnections.find((c) => c.id === selectedConnectionId);
    }
    return activeConnections.find((c) => c.isPrimary) || activeConnections[0];
  }, [activeConnections, selectedConnectionId]);

  // Parse mentions from body text
  const parseMentions = useCallback((text: string) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: Array<{ memberId: string; displayName: string; email: string }> = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const displayName = match[1];
      const memberId = match[2];
      const member = activeMembers.find((m) => m.id === memberId);
      if (member) {
        mentions.push({
          memberId,
          displayName,
          email: member.email,
        });
      }
    }
    return mentions;
  }, [activeMembers]);

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
    if (!body.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a comment or add an attachment');
      return;
    }

    try {
      // Build final body with attachments appended as markdown
      // Use attachment:id format for images so URLs can be refreshed (presigned URLs expire)
      let finalBody = body.trim();
      if (uploadedFiles.length > 0) {
        const attachmentMarkdown = uploadedFiles
          .map((file) =>
            file.isImage
              ? `![${file.name}](attachment:${file.id})`
              : `[${file.name}](attachment:${file.id})`
          )
          .join('\n');
        finalBody = finalBody
          ? `${finalBody}\n\n${attachmentMarkdown}`
          : attachmentMarkdown;
      }

      const authorName = getAuthorName();
      const mentions = parseMentions(finalBody);
      await createComment.mutateAsync({
        body: finalBody,
        authorType: 'AGENT',
        authorName,
        metadata: {
          ...(isInternal && { isInternal: true }),
          ...(authorName && { authorName }),
          ...(mentions.length > 0 && { mentions }),
        },
        ...(action !== 'comment' && { setStatus: action }),
        ...(selectedConnection && !isInternal && { connectionId: selectedConnection.id }),
        ...(ccRecipients.length > 0 && !isInternal && { cc: ccRecipients }),
      });
      setBody('');
      setIsInternal(false);
      setCcRecipients([]);
      setShowCcInput(false);
      setCcInput('');
      setUploadedFiles([]);

      const messages: Record<SubmitAction, string> = {
        comment: 'Comment added',
        pending: 'Comment added & set to Pending',
        resolved: 'Comment added & set to Resolved',
      };
      toast.success(messages[action]);
    } catch {
      toast.error('Failed to add comment');
    }
  }, [body, isInternal, createComment, profile?.displayName, session?.email, selectedConnection, ccRecipients, uploadedFiles, parseMentions]);

  // Handle adding a CC recipient
  const handleAddCc = useCallback(() => {
    const email = ccInput.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !ccRecipients.includes(email)) {
      setCcRecipients((prev) => [...prev, email]);
      setCcInput('');
    }
  }, [ccInput, ccRecipients]);

  // Handle removing a CC recipient
  const handleRemoveCc = useCallback((email: string) => {
    setCcRecipients((prev) => prev.filter((e) => e !== email));
  }, []);

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
      // Add to uploaded files list (don't insert markdown into body)
      setUploadedFiles((prev) => [
        ...prev,
        {
          id: attachment.id,
          name: file.name,
          url: attachment.downloadUrl,
          isImage,
        },
      ]);
      toast.success(isImage ? 'Image uploaded' : 'File attached');
    } catch {
      toast.error(isImage ? 'Failed to upload image' : 'Failed to attach file');
    } finally {
      setIsUploading(false);
    }
  }, [uploadAttachment]);

  // Handle image input change (supports multiple files)
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Validate all files are images
      const nonImageFile = Array.from(files).find((f) => !f.type.startsWith('image/'));
      if (nonImageFile) {
        toast.error('Please select only image files');
        e.target.value = '';
        return;
      }
      // Upload all selected images
      Array.from(files).forEach((file) => handleFileUpload(file));
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

  // Split uploaded files into images and attachments for display
  const images = useMemo(() => uploadedFiles.filter((f) => f.isImage), [uploadedFiles]);
  const attachments = useMemo(() => uploadedFiles.filter((f) => !f.isImage), [uploadedFiles]);

  // Remove an uploaded file
  const removeUploadedFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative">
        <MentionAutocomplete
          ref={textareaRef}
          value={body}
          onChange={setBody}
          members={activeMembers}
          placeholder="Add a comment... (paste images directly, type @ to mention)"
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
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.url}
                alt={img.name}
                className="h-20 w-20 object-cover rounded-md border"
              />
              <button
                type="button"
                onClick={() => removeUploadedFile(img.id)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {attachments.map((file) => (
            <div key={file.id} className="relative group flex items-center gap-2 px-3 py-2 bg-muted rounded-md border">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate max-w-[150px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeUploadedFile(file.id)}
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
        multiple
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />
      {/* Email selection and CC row - only show for external comments with active email connections */}
      {!isInternal && activeConnections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {/* Email selector */}
          <div className="flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">From:</span>
            {activeConnections.length === 1 ? (
              <span className="text-foreground">{selectedConnection?.email}</span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 font-normal">
                    {selectedConnection?.email || 'Select email'}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {activeConnections.map((conn) => (
                    <DropdownMenuItem
                      key={conn.id}
                      onClick={() => setSelectedConnectionId(conn.id)}
                      className="flex items-center gap-2"
                    >
                      <span>{conn.email}</span>
                      {conn.isPrimary && (
                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                      )}
                      {conn.name !== 'Default' && (
                        <span className="text-muted-foreground">({conn.name})</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {/* CC toggle and input */}
          <div className="flex items-center gap-1.5">
            {!showCcInput && ccRecipients.length === 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground"
                onClick={() => setShowCcInput(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                CC
              </Button>
            )}
            {(showCcInput || ccRecipients.length > 0) && (
              <>
                <span className="text-muted-foreground">CC:</span>
                {ccRecipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveCc(email)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="email"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddCc();
                    }
                  }}
                  onBlur={handleAddCc}
                  placeholder="Add email..."
                  className="h-6 w-32 px-1.5 text-sm border rounded bg-background"
                />
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-muted-foreground whitespace-nowrap">Internal note</span>
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

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSubmit('pending')}
            disabled={createComment.isPending || !body.trim()}
            title={`Add & Pending (${modKey}+Shift+P)`}
            className="px-2 md:px-3"
          >
            <Clock className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Pending</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSubmit('resolved')}
            disabled={createComment.isPending || !body.trim()}
            title={`Add & Resolve (${modKey}+Shift+R)`}
            className="px-2 md:px-3"
          >
            <CheckCircle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Resolve</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit('comment')}
            disabled={createComment.isPending || !body.trim()}
            title={`Add Comment (${modKey}+Enter)`}
          >
            <Send className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{createComment.isPending ? 'Adding...' : 'Send'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
