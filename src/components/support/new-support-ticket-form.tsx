'use client';

import { useState, useRef } from 'react';
import { useSupportPortal, SupportTicket, SupportAttachment } from '@/lib/hooks/use-support-portal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Paperclip, X, Loader2, FileIcon, ImageIcon } from 'lucide-react';

interface PendingFile {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  attachmentId?: string;
  error?: string;
}

interface NewSupportTicketFormProps {
  onSuccess: (ticket: SupportTicket) => void;
  onCancel: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NewSupportTicketForm({ onSuccess, onCancel }: NewSupportTicketFormProps) {
  const { createTicket, uploadFile } = useSupportPortal();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check total file count
    if (pendingFiles.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const newPendingFiles: PendingFile[] = [];

    for (const file of Array.from(files)) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      newPendingFiles.push({
        file,
        uploading: true,
        uploaded: false,
      });
    }

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);

    // Upload each file
    for (const pf of newPendingFiles) {
      try {
        const attachment = await uploadFile(pf.file);
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.file === pf.file
              ? { ...f, uploading: false, uploaded: true, attachmentId: attachment.id }
              : f
          )
        );
      } catch (err) {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.file === pf.file
              ? { ...f, uploading: false, error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        );
        toast.error(`Failed to upload ${pf.file.name}`);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (file: File) => {
    setPendingFiles((prev) => prev.filter((f) => f.file !== file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    // Check if any files are still uploading
    if (pendingFiles.some((f) => f.uploading)) {
      toast.error('Please wait for files to finish uploading');
      return;
    }

    try {
      setSubmitting(true);

      // Collect successfully uploaded attachment IDs
      const attachmentIds = pendingFiles
        .filter((f) => f.uploaded && f.attachmentId)
        .map((f) => f.attachmentId!);

      // Generate idempotency key to prevent double submissions
      const idempotencyKey = `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const ticket = await createTicket(
        {
          title: title.trim(),
          body: body.trim() || undefined,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        },
        idempotencyKey
      );

      toast.success('Ticket created');
      onSuccess(ticket);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Create Support Ticket</h2>
        <p className="text-sm text-muted-foreground">
          Describe your issue and our team will get back to you.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Subject</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of your issue"
            disabled={submitting}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Description</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Provide details about your issue, including any steps to reproduce, error messages, or screenshots..."
            className="min-h-[150px] resize-none"
            disabled={submitting}
          />
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label>Attachments</Label>
          <div className="space-y-3">
            {/* File list */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                {pendingFiles.map((pf, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-2 rounded-md border ${
                      pf.error ? 'border-destructive bg-destructive/5' : 'bg-muted/50'
                    }`}
                  >
                    {pf.file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{pf.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(pf.file.size)}
                        {pf.error && <span className="text-destructive ml-2">{pf.error}</span>}
                      </p>
                    </div>
                    {pf.uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(pf.file)}
                        disabled={submitting}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {pendingFiles.length < MAX_FILES && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={submitting}
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.json,.log"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Add files
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {MAX_FILES} files, 10MB each. Images, PDFs, documents supported.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? 'Creating...' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
}
