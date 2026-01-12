'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTicket, useCreateTicketDynamic, useBrands, useFieldsByEntity, useTeamMembers } from '@/lib/hooks';
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
import { toast } from 'sonner';
import { CustomFieldsFormSection, validateCustomFields } from '@/components/fields';

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

interface CreateTicketDialogProps {
  brandId?: string;  // Optional - if not provided, show brand selector
  children?: React.ReactNode;
}

export function CreateTicketDialog({ brandId: fixedBrandId, children }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  const { data: brands } = useBrands();
  const { data: teamData } = useTeamMembers();
  const teamMembers = teamData?.members?.filter(m => m.status === 'active') || [];

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
      assigneeId: '',
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

  // Watch brandId for custom fields
  const selectedBrandId = form.watch('brandId');
  const currentBrandId = fixedBrandId || selectedBrandId;
  const { data: ticketFields } = useFieldsByEntity(currentBrandId, 'ticket');

  // Reset custom field values when brand changes
  useEffect(() => {
    setCustomFieldValues({});
    setCustomFieldErrors({});
  }, [currentBrandId]);

  const onSubmit = async (data: CreateTicketForm) => {
    // Validate custom fields
    const cfErrors = validateCustomFields(ticketFields, customFieldValues);
    if (Object.keys(cfErrors).length > 0) {
      setCustomFieldErrors(cfErrors);
      return;
    }
    setCustomFieldErrors({});

    try {
      const ticketData = {
        title: data.title,
        body: data.body,
        priority: data.priority,
        assigneeId: data.assigneeId || undefined,
        source: 'web' as const,
        customFields: {
          ...(data.requesterName && { requesterName: data.requesterName }),
          ...(data.requesterEmail && { requesterEmail: data.requesterEmail }),
          ...customFieldValues,
        },
        notifyCustomer: data.notifyCustomer,
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
    } catch {
      toast.error('Failed to create ticket');
    }
  };

  const isPending = fixedBrandId ? createTicketFixed.isPending : createTicketDynamic.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button>Create Ticket</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
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
                        <SelectItem value="">Unassigned</SelectItem>
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
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
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

            {currentBrandId && ticketFields && ticketFields.filter(f => f.visible).length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Custom Fields</h4>
                <CustomFieldsFormSection
                  brandId={currentBrandId}
                  entityType="ticket"
                  values={customFieldValues}
                  onChange={setCustomFieldValues}
                  errors={customFieldErrors}
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
