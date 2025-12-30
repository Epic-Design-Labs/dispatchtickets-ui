'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TicketFilters as TicketFiltersType } from '@/types';

interface TicketFiltersProps {
  filters: TicketFiltersType;
  onFiltersChange: (filters: TicketFiltersType) => void;
}

export function TicketFilters({ filters, onFiltersChange }: TicketFiltersProps) {
  const updateFilter = <K extends keyof TicketFiltersType>(
    key: K,
    value: TicketFiltersType[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ''
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex-1">
        <Input
          placeholder="Search tickets..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Status
            {filters.status && (
              <span className="ml-1 rounded bg-primary/10 px-1.5 text-xs">
                {filters.status}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={filters.status || ''}
            onValueChange={(value) =>
              updateFilter('status', value || undefined)
            }
          >
            <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="open">Open</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="pending">Pending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="resolved">Resolved</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="closed">Closed</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
