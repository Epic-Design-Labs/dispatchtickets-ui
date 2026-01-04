'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useCompanies, useCreateCompany } from '@/lib/hooks';
import { toast } from 'sonner';

interface CompanyComboboxProps {
  brandId: string;
  value?: string; // company ID
  companyName?: string; // for display when value is set
  onChange: (companyId: string | undefined, companyName?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CompanyCombobox({
  brandId,
  value,
  companyName,
  onChange,
  disabled,
  placeholder = 'Select or create company...',
}: CompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: companiesData } = useCompanies(brandId);
  const createCompany = useCreateCompany(brandId);

  const companies = companiesData?.data || [];

  // Filter companies based on search
  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check if search matches any existing company exactly
  const exactMatch = companies.find(
    (c) => c.name.toLowerCase() === search.toLowerCase()
  );

  // Get display value
  const displayValue = value
    ? companyName || companies.find((c) => c.id === value)?.name || 'Unknown'
    : null;

  const handleSelect = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    onChange(companyId, company?.name);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange(undefined, undefined);
    setOpen(false);
    setSearch('');
  };

  const handleCreateNew = async () => {
    if (!search.trim()) return;

    try {
      const newCompany = await createCompany.mutateAsync({
        name: search.trim(),
      });
      onChange(newCompany.id, newCompany.name);
      toast.success(`Company "${newCompany.name}" created`);
      setOpen(false);
      setSearch('');
    } catch {
      toast.error('Failed to create company');
    }
  };

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
          {displayValue || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type to create..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
              {search ? 'No companies found.' : 'Type to search...'}
            </CommandEmpty>
            <CommandGroup>
              {/* Clear option if value is set */}
              {value && (
                <CommandItem onSelect={handleClear} className="text-muted-foreground">
                  <span className="mr-2">✕</span>
                  No company
                </CommandItem>
              )}

              {/* Existing companies */}
              {filteredCompanies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.id}
                  onSelect={() => handleSelect(company.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === company.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {company.name}
                  {company.domain && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {company.domain}
                    </span>
                  )}
                </CommandItem>
              ))}

              {/* Create new option - show when there's search text and no exact match */}
              {search.trim() && !exactMatch && (
                <CommandItem
                  onSelect={handleCreateNew}
                  disabled={createCompany.isPending}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create &quot;{search.trim()}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
