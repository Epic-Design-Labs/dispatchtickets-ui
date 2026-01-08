'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInviteMember, useBrands } from '@/lib/hooks';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { OrgRole } from '@/types';

const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'member'] as const),
});

type InviteMemberForm = z.infer<typeof inviteMemberSchema>;

interface InviteMemberDialogProps {
  children?: React.ReactNode;
}

export function InviteMemberDialog({ children }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [allBrands, setAllBrands] = useState(true);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const inviteMember = useInviteMember();
  const { data: brands } = useBrands();

  const form = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: 'member',
    },
  });

  const handleAllBrandsChange = (checked: boolean) => {
    setAllBrands(checked);
    if (checked) {
      setSelectedBrandIds([]);
    }
  };

  const handleBrandToggle = (brandId: string) => {
    if (allBrands) {
      setAllBrands(false);
    }
    setSelectedBrandIds((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]
    );
  };

  const resetForm = () => {
    form.reset();
    setAllBrands(true);
    setSelectedBrandIds([]);
  };

  const onSubmit = async (data: InviteMemberForm) => {
    try {
      await inviteMember.mutateAsync({
        email: data.email,
        role: data.role as OrgRole,
        allBrands,
        brandIds: allBrands ? [] : selectedBrandIds,
      });
      toast.success(`Invitation sent to ${data.email}`);
      setOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to send invitation');
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    member: 'Member',
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {children || (
          <Button>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization. They will receive an email with a link to
            accept.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="colleague@company.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {roleLabels[field.value]}
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
                      <DropdownMenuRadioGroup value={field.value} onValueChange={field.onChange}>
                        <DropdownMenuRadioItem value="member">
                          <div>
                            <p>Member</p>
                            <p className="text-xs text-muted-foreground">
                              Can view and manage tickets
                            </p>
                          </div>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="admin">
                          <div>
                            <p>Admin</p>
                            <p className="text-xs text-muted-foreground">
                              Can manage team and settings
                            </p>
                          </div>
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand Access Section */}
            <div className="space-y-3 pt-2">
              <FormLabel>Brand Access</FormLabel>

              {/* All brands toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">All current and future brands</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically includes any new brands created
                  </p>
                </div>
                <Switch checked={allBrands} onCheckedChange={handleAllBrandsChange} />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or select specific brands
                  </span>
                </div>
              </div>

              {/* Individual brand toggles */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {brands?.map((brand) => {
                  const isSelected = allBrands || selectedBrandIds.includes(brand.id);
                  return (
                    <div
                      key={brand.id}
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        allBrands ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{brand.name}</span>
                        {isSelected && !allBrands && (
                          <Badge variant="secondary" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <Switch
                        checked={isSelected}
                        onCheckedChange={() => handleBrandToggle(brand.id)}
                        disabled={allBrands}
                      />
                    </div>
                  );
                })}

                {(!brands || brands.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No brands available. Create a workspace first.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMember.isPending}>
                {inviteMember.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
