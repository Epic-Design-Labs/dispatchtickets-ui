'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateContact } from '@/lib/hooks';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CompanyCombobox } from '@/components/companies/company-combobox';
import { Plus } from 'lucide-react';

const createContactSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().optional(),
  companyId: z.string().optional(),
});

type CreateContactForm = z.infer<typeof createContactSchema>;

interface CreateContactDialogProps {
  brandId: string;
  children?: React.ReactNode;
  onSuccess?: (contact: { id: string; email: string; name?: string }) => void;
  defaultCompany?: {
    id: string;
    name: string;
  };
}

export function CreateContactDialog({ brandId, children, onSuccess, defaultCompany }: CreateContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string | undefined>(defaultCompany?.name);
  const createContact = useCreateContact(brandId);

  const form = useForm<CreateContactForm>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      email: '',
      name: '',
      companyId: defaultCompany?.id || '',
    },
  });

  const onSubmit = async (data: CreateContactForm) => {
    try {
      const contact = await createContact.mutateAsync({
        email: data.email,
        name: data.name || undefined,
        companyId: data.companyId || undefined,
      });
      toast.success('Contact created successfully');
      setOpen(false);
      form.reset({
        email: '',
        name: '',
        companyId: defaultCompany?.id || '',
      });
      setCompanyName(defaultCompany?.name);
      onSuccess?.(contact);
    } catch {
      toast.error('Failed to create contact');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Contact</DialogTitle>
          <DialogDescription>
            Add a new contact to this brand.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <CompanyCombobox
                    brandId={brandId}
                    value={field.value}
                    companyName={companyName}
                    onChange={(id, name) => {
                      field.onChange(id || '');
                      setCompanyName(name);
                    }}
                    placeholder="Select or create company..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createContact.isPending}>
                {createContact.isPending ? 'Creating...' : 'Create Contact'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
