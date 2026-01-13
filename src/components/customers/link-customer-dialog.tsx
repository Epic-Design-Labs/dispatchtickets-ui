'use client';

import { useState, useCallback } from 'react';
import { User, Link as LinkIcon } from 'lucide-react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useCustomerSearch, useUpdateCustomer } from '@/lib/hooks';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { toast } from 'sonner';

interface LinkCustomerDialogProps {
  brandId: string;
  companyId: string;
  companyName: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
}

export function LinkCustomerDialog({
  brandId,
  companyId,
  companyName,
  children,
  onSuccess,
}: LinkCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string | null | undefined;
    email: string;
  } | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const { data: searchResults, isLoading } = useCustomerSearch(brandId, debouncedSearch);
  const customers = searchResults || [];

  const handleSelect = useCallback((customer: { id: string; name?: string | null; email: string }) => {
    setSelectedCustomer({
      id: customer.id,
      name: customer.name,
      email: customer.email,
    });
  }, []);

  const handleLink = async () => {
    if (!selectedCustomer) return;

    setIsLinking(true);
    try {
      // Use the API directly to update the customer's company
      const { apiClient } = await import('@/lib/api/client');
      await apiClient.patch(`/brands/${brandId}/customers/${selectedCustomer.id}`, {
        companyId,
      });

      toast.success(`${selectedCustomer.name || selectedCustomer.email} linked to ${companyName}`);
      setOpen(false);
      setSearch('');
      setSelectedCustomer(null);
      onSuccess?.();
    } catch {
      toast.error('Failed to link customer');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <LinkIcon className="mr-2 h-4 w-4" />
            Link Customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Customer to {companyName}</DialogTitle>
          <DialogDescription>
            Search for an existing customer to add to this company.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Command shouldFilter={false} className="border rounded-md">
            <CommandInput
              placeholder="Search customers by name or email..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[200px]">
              {isLoading && debouncedSearch.length >= 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {!isLoading && debouncedSearch.length >= 2 && customers.length === 0 && (
                <CommandEmpty className="py-6 text-center text-sm">
                  No customers found
                </CommandEmpty>
              )}
              {!isLoading && debouncedSearch.length < 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search...
                </div>
              )}
              {customers.length > 0 && (
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleSelect(customer)}
                      className={selectedCustomer?.id === customer.id ? 'bg-accent' : ''}
                    >
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {customer.name || customer.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {customer.email}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          {selectedCustomer && (
            <div className="mt-4 p-3 rounded-md border bg-muted/50">
              <p className="text-sm font-medium">Selected:</p>
              <p className="text-sm">{selectedCustomer.name || selectedCustomer.email}</p>
              {selectedCustomer.name && (
                <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setSearch('');
              setSelectedCustomer(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedCustomer || isLinking}
          >
            {isLinking ? 'Linking...' : 'Link Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
