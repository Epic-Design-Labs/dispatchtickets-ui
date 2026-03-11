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
import { useContactSearch } from '@/lib/hooks';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { toast } from 'sonner';

interface LinkContactDialogProps {
  brandId: string;
  companyId: string;
  companyName: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
}

export function LinkContactDialog({
  brandId,
  companyId,
  companyName,
  children,
  onSuccess,
}: LinkContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<{
    id: string;
    name: string | null | undefined;
    email: string;
  } | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const { data: searchResults, isLoading } = useContactSearch(brandId, debouncedSearch);
  const contacts = searchResults || [];

  const handleSelect = useCallback((contact: { id: string; name?: string | null; email: string }) => {
    setSelectedContact({
      id: contact.id,
      name: contact.name,
      email: contact.email,
    });
  }, []);

  const handleLink = async () => {
    if (!selectedContact) return;

    setIsLinking(true);
    try {
      const { apiClient } = await import('@/lib/api/client');
      await apiClient.patch(`/brands/${brandId}/contacts/${selectedContact.id}`, {
        companyId,
      });

      toast.success(`${selectedContact.name || selectedContact.email} linked to ${companyName}`);
      setOpen(false);
      setSearch('');
      setSelectedContact(null);
      onSuccess?.();
    } catch {
      toast.error('Failed to link contact');
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
            Link Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Link Contact to {companyName}</DialogTitle>
          <DialogDescription>
            Search for an existing contact to add to this company.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Command shouldFilter={false} className="border rounded-md">
            <CommandInput
              placeholder="Search contacts by name or email..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[200px]">
              {isLoading && debouncedSearch.length >= 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {!isLoading && debouncedSearch.length >= 2 && contacts.length === 0 && (
                <CommandEmpty className="py-6 text-center text-sm">
                  No contacts found
                </CommandEmpty>
              )}
              {!isLoading && debouncedSearch.length < 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search...
                </div>
              )}
              {contacts.length > 0 && (
                <CommandGroup>
                  {contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => handleSelect(contact)}
                      className={selectedContact?.id === contact.id ? 'bg-accent' : ''}
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
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          {selectedContact && (
            <div className="mt-4 p-3 rounded-md border bg-muted/50">
              <p className="text-sm font-medium">Selected:</p>
              <p className="text-sm">{selectedContact.name || selectedContact.email}</p>
              {selectedContact.name && (
                <p className="text-xs text-muted-foreground">{selectedContact.email}</p>
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
              setSelectedContact(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedContact || isLinking}
          >
            {isLinking ? 'Linking...' : 'Link Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
