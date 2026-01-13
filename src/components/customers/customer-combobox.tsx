'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCustomerSearch } from '@/lib/hooks';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface CustomerComboboxProps {
  brandId: string;
  value?: string; // customer name
  onChange: (customer: { name: string; email: string } | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CustomerCombobox({
  brandId,
  value,
  onChange,
  disabled,
  placeholder = 'Search or enter customer name...',
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const debouncedSearch = useDebounce(search, 300);

  // Search for customers
  const { data: searchResults, isLoading } = useCustomerSearch(brandId, debouncedSearch);
  const customers = searchResults || [];

  // Update search when value changes externally
  useEffect(() => {
    if (value !== undefined) {
      setSearch(value);
    }
  }, [value]);

  const handleSelect = useCallback((customer: { id: string; name?: string | null; email: string }) => {
    const name = customer.name || customer.email.split('@')[0];
    onChange({ name, email: customer.email });
    setSearch(name);
    setOpen(false);
  }, [onChange]);

  const handleInputChange = useCallback((newValue: string) => {
    setSearch(newValue);
    // When user types, clear the selection (they're entering a new name)
    if (newValue !== value) {
      // Don't call onChange here - let them finish typing
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    // When user finishes typing without selecting, use what they typed
    // But only if they've typed something and not selected from list
    if (search && search !== value) {
      onChange({ name: search, email: '' });
    }
  }, [search, value, onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {search || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search customers by name or email..."
            value={search}
            onValueChange={handleInputChange}
            onBlur={handleBlur}
          />
          <CommandList>
            {isLoading && debouncedSearch.length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!isLoading && debouncedSearch.length >= 2 && customers.length === 0 && (
              <CommandEmpty className="py-6 text-center text-sm">
                <p className="text-muted-foreground">No customers found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Type a name and email below.
                </p>
              </CommandEmpty>
            )}
            {!isLoading && debouncedSearch.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search...
              </div>
            )}
            {customers.length > 0 && (
              <CommandGroup heading="Existing Customers">
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelect(customer)}
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
                    {value === (customer.name || customer.email.split('@')[0]) && (
                      <Check className="ml-2 h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
