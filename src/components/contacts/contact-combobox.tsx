'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check, ChevronsUpDown, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useContactSearch } from '@/lib/hooks';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface ContactComboboxProps {
  brandId: string;
  value?: string; // contact name
  onChange: (contact: { name: string; email: string } | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ContactCombobox({
  brandId,
  value,
  onChange,
  disabled,
  placeholder = 'Search or enter contact name...',
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const debouncedSearch = useDebounce(search, 300);

  // Search for contacts
  const { data: searchResults, isLoading } = useContactSearch(brandId, debouncedSearch);
  const contacts = searchResults || [];

  // Update search when value changes externally
  useEffect(() => {
    if (value !== undefined) {
      setSearch(value);
    }
  }, [value]);

  const handleSelect = useCallback((contact: { id: string; name?: string | null; email: string }) => {
    const name = contact.name || contact.email.split('@')[0];
    onChange({ name, email: contact.email });
    setSearch(name);
    setOpen(false);
  }, [onChange]);

  const handleCreateNew = useCallback(() => {
    // Set the name and signal that email needs to be filled in
    if (search.trim()) {
      onChange({ name: search.trim(), email: '' });
      setOpen(false);
    }
  }, [search, onChange]);

  const handleInputChange = useCallback((newValue: string) => {
    setSearch(newValue);
  }, []);

  // Check if the search matches any existing contact exactly
  const exactMatch = contacts.some(
    (c) => c.name?.toLowerCase() === search.toLowerCase() || c.email.toLowerCase() === search.toLowerCase()
  );

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
            placeholder="Search contacts by name or email..."
            value={search}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {isLoading && debouncedSearch.length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!isLoading && debouncedSearch.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search...
              </div>
            )}
            {contacts.length > 0 && (
              <CommandGroup heading="Existing Contacts">
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={() => handleSelect(contact)}
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {contact.name || contact.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.email}
                      </p>
                    </div>
                    {value === (contact.name || contact.email.split('@')[0]) && (
                      <Check className="ml-2 h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {/* Show "Create new" option when search has content and doesn't exactly match */}
            {!isLoading && debouncedSearch.length >= 2 && search.trim() && !exactMatch && (
              <>
                {contacts.length > 0 && <CommandSeparator />}
                <CommandGroup heading="New Contact">
                  <CommandItem
                    value={`create-${search}`}
                    onSelect={handleCreateNew}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Create &quot;{search.trim()}&quot;</p>
                      <p className="text-xs text-muted-foreground">
                        Enter email in the field below
                      </p>
                    </div>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
            {/* Message when no results and no search */}
            {!isLoading && debouncedSearch.length >= 2 && contacts.length === 0 && !search.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No contacts found.
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
