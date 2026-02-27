'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTicket, useCreateTicketDynamic, useBrands, useFieldsByEntity, useTeamMembers, useUploadPendingAttachment } from '@/lib/hooks';
import { Attachment } from '@/lib/api/attachments';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { CustomFieldsFormSection, validateCustomFields } from '@/components/fields';
import { CustomerCombobox } from '@/components/customers/customer-combobox';
import { Eye, Plus, X, Paperclip, Upload, FileIcon, Loader2 } from 'lucide-react';

const createTicketSchema = z.object({
  brandId: z.string().min(1, 'Brand is required'),
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  assigneeId: z.string().optional(),
  requesterEmail: z.string().email().optional().or(z.literal('')),
  requesterName: z.string().optional(),
  notifyCustomer: z.boolean(),
});

const priorityColors: Record<string, string> = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

type CreateTicketForm = z.infer<typeof createTicketSchema>;

interface WatcherInput {
  memberId: string;
  memberEmail: string;
  memberName?: string;
}

interface CreateTicketDialogProps {
  brandId?: string;  // Optional - if not provided, show brand selector
  children?: React.ReactNode;
}

interface PendingAttachment {
  id: string;
  filename: string;
  size: number;
  uploading?: boolean;
}

export function CreateTicketDialog({ brandId: fixedBrandId, children }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  const [watchers, setWatchers] = useState<WatcherInput[]>([]);
  const [watcherPopoverOpen, setWatcherPopoverOpen] = useState(false);
  const [customWatcherEmail, setCustomWatcherEmail] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: brands } = useBrands();

  // Use fixed brand mutation if brandId is provided, otherwise use dynamic
  const createTicketFixed = useCreateTicket(fixedBrandId || '');
  const createTicketDynamic = useCreateTicketDynamic();

  const showBrandSelector = !fixedBrandId;

  const form = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      brandId: fixedBrandId || '',
      title: '',
      body: '',
      priority: 'normal',
      assigneeId: 'unassigned',
      requesterEmail: '',
      requesterName: '',
      notifyCustomer: false,
    },
  });

  // Update brandId when fixedBrandId changes
  useEffect(() => {
    if (fixedBrandId) {
      form.setValue('brandId', fixedBrandId);
    }
  }, [fixedBrandId, form]);

  // Watch requesterEmail to show/hide notify option
  const requesterEmail = form.watch('requesterEmail');
  const hasRequesterEmail = requesterEmail && requesterEmail.length > 0;

  // Watch brandId for custom fields and team members
  const selectedBrandId = form.watch('brandId');
  const currentBrandId = fixedBrandId || selectedBrandId;
  const { data: ticketFields } = useFieldsByEntity(currentBrandId, 'ticket');

  // Team members filtered by the selected brand
  const { data: teamData } = useTeamMembers({ brandId: currentBrandId || undefined });
  const teamMembers = teamData?.members?.filter(m => m.status === 'active') || [];

  // Reset custom field values, watchers, and attachments when brand changes
  useEffect(() => {
    setCustomFieldValues({});
    setCustomFieldErrors({});
    setWatchers([]);
    setPendingAttachments([]);
  }, [currentBrandId]);

  // Upload pending attachment mutation
  const uploadPendingAttachment = useUploadPendingAttachment(currentBrandId || '');

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentBrandId) return;

    setIsUploading(true);
    const newAttachments: PendingAttachment[] = [];

    for (const file of Array.from(files)) {
      // Add to list as uploading
      const tempId = `temp_${Date.now()}_${file.name}`;
      setPendingAttachments(prev => [...prev, { id: tempId, filename: file.name, size: file.size, uploading: true }]);

      try {
        const attachment = await uploadPendingAttachment.mutateAsync(file);
        // Replace temp entry with actual attachment
        setPendingAttachments(prev =>
          prev.map(a => a.id === tempId ? { id: attachment.id, filename: attachment.filename, size: attachment.size } : a)
        );
        newAttachments.push({ id: attachment.id, filename: attachment.filename, size: attachment.size });
      } catch (error) {
        // Remove failed upload from list
        setPendingAttachments(prev => prev.filter(a => a.id !== tempId));
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentBrandId, uploadPendingAttachment]);

  // Remove a pending attachment
  const removePendingAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const onSubmit = async (data: CreateTicketForm) => {
    // Validate custom fields (only those shown on create form)
    const cfErrors = validateCustomFields(ticketFields, customFieldValues, { createForm: true });
    if (Object.keys(cfErrors).length > 0) {
      setCustomFieldErrors(cfErrors);
      return;
    }
    setCustomFieldErrors({});

    try {
      // Get attachment IDs from pending attachments (only those that finished uploading)
      const attachmentIds = pendingAttachments
        .filter(a => !a.uploading)
        .map(a => a.id);

      const ticketData = {
        title: data.title,
        body: data.body,
        priority: data.priority,
        assigneeId: data.assigneeId === 'unassigned' ? undefined : data.assigneeId,
        source: 'web' as const,
        customFields: {
          ...(data.requesterName && { requesterName: data.requesterName }),
          ...(data.requesterEmail && { requesterEmail: data.requesterEmail }),
          ...customFieldValues,
        },
        notifyCustomer: data.notifyCustomer,
        watchers: watchers.length > 0 ? watchers : undefined,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      };

      if (fixedBrandId) {
        await createTicketFixed.mutateAsync(ticketData);
      } else {
        await createTicketDynamic.mutateAsync({
          brandId: data.brandId,
          data: ticketData,
        });
      }
      toast.success('Ticket created successfully');
      setOpen(false);
      form.reset();
      setCustomFieldValues({});
      setWatchers([]);
      setPendingAttachments([]);
    } catch {
      toast.error('Failed to create ticket');
    }
  };

  const addWatcher = (memberId: string, memberEmail: string, memberName?: string) => {
    if (!watchers.some((w) => w.memberEmail === memberEmail)) {
      setWatchers([...watchers, { memberId, memberEmail, memberName }]);
    }
    setWatcherPopoverOpen(false);
    setCustomWatcherEmail('');
  };

  const removeWatcher = (memberEmail: string) => {
    setWatchers(watchers.filter((w) => w.memberEmail !== memberEmail));
  };

  const addCustomWatcher = () => {
    const email = customWatcherEmail.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addWatcher(`custom_${email}`, email);
    }
  };

  // Filter out team members who are already watchers
  const availableTeamMembers = teamMembers.filter(
    (member) => !watchers.some((w) => w.memberId === member.id)
  );

  const getMemberName = (member: typeof teamMembers[0]) => {
    if (member.firstName || member.lastName) {
      return [member.firstName, member.lastName].filter(Boolean).join(' ');
    }
    return member.email;
  };

  const isPending = fixedBrandId ? createTicketFixed.isPending : createTicketDynamic.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button>Create Ticket</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Ticket</DialogTitle>
          <DialogDescription>
            Create a new support ticket{showBrandSelector ? '' : ' in this workspace'}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {showBrandSelector && (
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a brand" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands?.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Detailed description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachments Section */}
            {currentBrandId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 mr-1" />
                    )}
                    Add
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                {pendingAttachments.length > 0 ? (
                  <div className="space-y-1">
                    {pendingAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 rounded border bg-muted/50 px-2 py-1.5 text-sm"
                      >
                        <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1">{attachment.filename}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatFileSize(attachment.size)}
                        </span>
                        {attachment.uploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => removePendingAttachment(attachment.id)}
                            className="hover:text-red-600 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No files attached</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            <span className={priorityColors[field.value]}>
                              {field.value.charAt(0).toUpperCase() + field.value.slice(1)}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">
                          <span className="text-gray-600">Low</span>
                        </SelectItem>
                        <SelectItem value="normal">
                          <span className="text-blue-600">Normal</span>
                        </SelectItem>
                        <SelectItem value="high">
                          <span className="text-orange-600">High</span>
                        </SelectItem>
                        <SelectItem value="urgent">
                          <span className="text-red-600">Urgent</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName || member.lastName
                              ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                              : member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requesterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    {currentBrandId ? (
                      <CustomerCombobox
                        brandId={currentBrandId}
                        value={field.value}
                        onChange={(customer) => {
                          if (customer) {
                            field.onChange(customer.name);
                            form.setValue('requesterEmail', customer.email);
                          } else {
                            field.onChange('');
                          }
                        }}
                        disabled={!currentBrandId}
                        placeholder="Search or enter name..."
                      />
                    ) : (
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requesterEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Auto-filled when selecting a customer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {hasRequesterEmail && (
              <FormField
                control={form.control}
                name="notifyCustomer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Notify customer</FormLabel>
                      <FormDescription>
                        Send a confirmation email to the customer about this ticket
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Watchers Section */}
            {currentBrandId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Watchers
                  </FormLabel>
                  <Popover open={watcherPopoverOpen} onOpenChange={setWatcherPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-6 px-2">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <Command>
                        <CommandInput
                          placeholder="Search or enter email..."
                          value={customWatcherEmail}
                          onValueChange={setCustomWatcherEmail}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customWatcherEmail.includes('@')) {
                              e.preventDefault();
                              addCustomWatcher();
                            }
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {customWatcherEmail.includes('@') ? (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
                                onClick={addCustomWatcher}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add &quot;{customWatcherEmail}&quot;
                              </button>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Enter email or search team members
                              </span>
                            )}
                          </CommandEmpty>
                          {availableTeamMembers.length > 0 && (
                            <CommandGroup heading="Team Members">
                              {availableTeamMembers.map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={member.email}
                                  onSelect={() => addWatcher(member.id, member.email, getMemberName(member))}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                      {member.firstName?.[0] || member.email[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm">{getMemberName(member)}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {watchers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {watchers.map((watcher) => (
                      <div
                        key={watcher.memberEmail}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 pl-1.5 pr-1 py-0.5 text-sm group"
                      >
                        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                          {(watcher.memberName || watcher.memberEmail)[0].toUpperCase()}
                        </div>
                        <span className="text-blue-700 text-xs">
                          {watcher.memberName || watcher.memberEmail.split('@')[0]}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeWatcher(watcher.memberEmail)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No watchers added</p>
                )}
                <FormDescription className="text-xs">
                  Watchers will be notified of ticket updates
                </FormDescription>
              </div>
            )}

            {currentBrandId && ticketFields && ticketFields.filter(f => f.showOnCreate !== false).length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Custom Fields</h4>
                <CustomFieldsFormSection
                  brandId={currentBrandId}
                  entityType="ticket"
                  values={customFieldValues}
                  onChange={setCustomFieldValues}
                  errors={customFieldErrors}
                  createForm
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
