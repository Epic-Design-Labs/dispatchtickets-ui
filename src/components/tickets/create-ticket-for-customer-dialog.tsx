'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTicket, useFieldsByEntity, useTeamMembers } from '@/lib/hooks';
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
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  assigneeId: z.string().optional(),
  notifyCustomer: z.boolean(),
});

const priorityColors: Record<string, string> = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

type CreateTicketForm = z.infer<typeof createTicketSchema>;

interface CreateTicketForCustomerDialogProps {
  brandId: string;
  customer: {
    name: string;
    email: string;
  };
  children?: React.ReactNode;
}

export function CreateTicketForCustomerDialog({
  brandId,
  customer,
  children,
}: CreateTicketForCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  const { data: teamData } = useTeamMembers();
  const teamMembers = teamData?.members?.filter(m => m.status === 'active') || [];

  const createTicket = useCreateTicket(brandId);
  const { data: ticketFields } = useFieldsByEntity(brandId, 'ticket');

  const form = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: '',
      body: '',
      priority: 'normal',
      assigneeId: 'unassigned',
      notifyCustomer: false,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset();
      setCustomFieldValues({});
      setCustomFieldErrors({});
    }
  }, [open, form]);

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
        assigneeId: data.assigneeId === 'unassigned' ? undefined : data.assigneeId,
        source: 'web' as const,
        customFields: {
          requesterName: customer.name,
          requesterEmail: customer.email,
          ...customFieldValues,
        },
        notifyCustomer: data.notifyCustomer,
      };

      await createTicket.mutateAsync(ticketData);
      toast.success('Ticket created successfully');
      setOpen(false);
      form.reset();
      setCustomFieldValues({});
    } catch {
      toast.error('Failed to create ticket');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button>Create Ticket</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Ticket for {customer.name || customer.email}</DialogTitle>
          <DialogDescription>
            Create a new support ticket for this customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer info display */}
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <div className="font-medium">{customer.name || 'No name'}</div>
              <div className="text-muted-foreground">{customer.email}</div>
            </div>

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

            {ticketFields && ticketFields.filter(f => f.visible).length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4">Custom Fields</h4>
                <CustomFieldsFormSection
                  brandId={brandId}
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
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? 'Creating...' : 'Create Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
