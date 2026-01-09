'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTicket, useCreateTicketDynamic, useBrands } from '@/lib/hooks';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const createTicketSchema = z.object({
  brandId: z.string().min(1, 'Brand is required'),
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  requesterEmail: z.string().email().optional().or(z.literal('')),
  requesterName: z.string().optional(),
  notifyCustomer: z.boolean(),
});

type CreateTicketForm = z.infer<typeof createTicketSchema>;

interface CreateTicketDialogProps {
  brandId?: string;  // Optional - if not provided, show brand selector
  children?: React.ReactNode;
}

export function CreateTicketDialog({ brandId: fixedBrandId, children }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
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

  const onSubmit = async (data: CreateTicketForm) => {
    try {
      const ticketData = {
        title: data.title,
        body: data.body,
        priority: data.priority,
        source: 'web' as const,
        customFields: {
          ...(data.requesterName && { requesterName: data.requesterName }),
          ...(data.requesterEmail && { requesterEmail: data.requesterEmail }),
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

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {field.value.charAt(0).toUpperCase() + field.value.slice(1)}
                        <svg
                          className="ml-2 h-4 w-4 opacity-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                          />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      <DropdownMenuRadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="normal">Normal</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="urgent">Urgent</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )}
            />

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
