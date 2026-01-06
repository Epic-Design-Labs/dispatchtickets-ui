'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { TicketFilters as TicketFiltersType } from '@/types';
import { cn } from '@/lib/utils';
import { X, ChevronDown } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  iconUrl?: string | null;
  ticketPrefix?: string | null;
}

interface TicketFiltersProps {
  filters: TicketFiltersType;
  onFiltersChange: (filters: TicketFiltersType) => void;
  brands?: Brand[];
  selectedBrandIds?: string[];
  onBrandFilterChange?: (brandIds: string[]) => void;
  showBrandFilter?: boolean;
}

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function TicketFilters({
  filters,
  onFiltersChange,
  brands,
  selectedBrandIds = [],
  onBrandFilterChange,
  showBrandFilter = false,
}: TicketFiltersProps) {
  const updateFilter = <K extends keyof TicketFiltersType>(
    key: K,
    value: TicketFiltersType[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
    if (onBrandFilterChange) {
      onBrandFilterChange([]);
    }
  };

  const hasFilters =
    Object.entries(filters).some(
      ([key, v]) => key !== 'limit' && v !== undefined && v !== ''
    ) || selectedBrandIds.length > 0;

  const toggleBrand = (brandId: string) => {
    if (!onBrandFilterChange) return;
    if (selectedBrandIds.includes(brandId)) {
      onBrandFilterChange(selectedBrandIds.filter((id) => id !== brandId));
    } else {
      onBrandFilterChange([...selectedBrandIds, brandId]);
    }
  };

  const removeBrand = (brandId: string) => {
    if (!onBrandFilterChange) return;
    onBrandFilterChange(selectedBrandIds.filter((id) => id !== brandId));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <Input
        placeholder="Search tickets..."
        value={filters.search || ''}
        onChange={(e) => updateFilter('search', e.target.value)}
        className="w-64"
      />

      {/* Status Button Bar */}
      <div className="flex items-center rounded-md border bg-muted/30 p-0.5">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => updateFilter('status', option.value || undefined)}
            className={cn(
              'px-3 py-1 text-sm rounded transition-colors',
              (filters.status || '') === option.value
                ? 'bg-background shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Priority Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Priority
            {filters.priority && (
              <span className="ml-1 rounded bg-primary/10 px-1.5 text-xs">
                {filters.priority}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Filter by priority</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={filters.priority || ''}
            onValueChange={(value) =>
              updateFilter('priority', value || undefined)
            }
          >
            <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="normal">Normal</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="urgent">Urgent</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Brand Filter (optional) */}
      {showBrandFilter && brands && brands.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Brands
              {selectedBrandIds.length > 0 && (
                <span className="ml-1 rounded bg-primary/10 px-1.5 text-xs">
                  {selectedBrandIds.length}
                </span>
              )}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by brand</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {brands.map((brand) => (
              <DropdownMenuCheckboxItem
                key={brand.id}
                checked={selectedBrandIds.includes(brand.id)}
                onCheckedChange={() => toggleBrand(brand.id)}
              >
                <div className="flex items-center gap-2">
                  {brand.iconUrl ? (
                    <img
                      src={brand.iconUrl}
                      alt={brand.name}
                      className="w-4 h-4 rounded"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[8px] font-medium">
                      {brand.ticketPrefix?.charAt(0) || 'B'}
                    </div>
                  )}
                  <span className="truncate">{brand.name}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Selected Brand Chips */}
      {showBrandFilter && selectedBrandIds.length > 0 && brands && (
        <div className="flex items-center gap-1">
          {selectedBrandIds.map((brandId) => {
            const brand = brands.find((b) => b.id === brandId);
            if (!brand) return null;
            return (
              <Badge
                key={brandId}
                variant="secondary"
                className="gap-1 pl-1.5 pr-1"
              >
                {brand.iconUrl ? (
                  <img
                    src={brand.iconUrl}
                    alt={brand.name}
                    className="w-3 h-3 rounded"
                  />
                ) : null}
                <span className="text-xs">{brand.name}</span>
                <button
                  onClick={() => removeBrand(brandId)}
                  className="ml-0.5 hover:bg-muted rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
