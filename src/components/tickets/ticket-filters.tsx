'use client';

import { useState } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TicketFilters as TicketFiltersType, Category, Tag, TeamMember } from '@/types';
import { cn } from '@/lib/utils';
import { X, ChevronDown, FolderOpen, Tag as TagIcon, User, SlidersHorizontal } from 'lucide-react';

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
  categories?: Category[];
  tags?: Tag[];
  teamMembers?: TeamMember[];
  /** Additional content to render at the end (e.g., Columns button) */
  children?: React.ReactNode;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
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
  categories,
  tags,
  teamMembers,
  children,
}: TicketFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
      ([key, v]) => key !== 'limit' && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
    ) || selectedBrandIds.length > 0;

  const toggleTag = (tagId: string) => {
    const currentTagIds = filters.tagIds || [];
    if (currentTagIds.includes(tagId)) {
      updateFilter('tagIds', currentTagIds.filter((id) => id !== tagId));
    } else {
      updateFilter('tagIds', [...currentTagIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    const currentTagIds = filters.tagIds || [];
    updateFilter('tagIds', currentTagIds.filter((id) => id !== tagId));
  };

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

  // Count active filters for mobile badge
  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.categoryId,
    filters.assigneeId,
    filters.tagIds && filters.tagIds.length > 0,
    selectedBrandIds.length > 0,
  ].filter(Boolean).length;

  // Mobile filter content (used in Sheet)
  const mobileFilterContent = (
    <div className="space-y-6 py-4">
      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={filters.status ?? 'active'}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select
          value={filters.priority || ''}
          onValueChange={(value) => updateFilter('priority', value || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      {categories && categories.length > 0 && (
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={filters.categoryId || ''}
            onValueChange={(value) => updateFilter('categoryId', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="null">Uncategorized</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Assignee */}
      {teamMembers && teamMembers.length > 0 && (
        <div className="space-y-2">
          <Label>Assignee</Label>
          <Select
            value={filters.assigneeId || ''}
            onValueChange={(value) => updateFilter('assigneeId', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers
                .filter((m) => m.status === 'active')
                .map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.firstName || member.lastName
                      ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                      : member.email}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border transition-colors',
                  filters.tagIds?.includes(tag.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted'
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color || '#6366f1' }}
                />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear filters button */}
      {hasFilters && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            clearFilters();
            setMobileFiltersOpen(false);
          }}
        >
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Mobile Filters */}
      <div className="flex md:hidden items-center gap-2">
        <Input
          placeholder="Search tickets..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="flex-1"
        />
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            {mobileFilterContent}
          </SheetContent>
        </Sheet>
        {children}
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
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
            onClick={() => updateFilter('status', option.value)}
            className={cn(
              'px-3 py-1 text-sm rounded transition-colors',
              (filters.status ?? 'active') === option.value
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

      {/* Category Filter */}
      {categories && categories.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderOpen className="mr-1 h-3.5 w-3.5" />
              Category
              {filters.categoryId && (
                <span className="ml-1 rounded bg-primary/10 px-1.5 text-xs">
                  {categories.find(c => c.id === filters.categoryId)?.name || '1'}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filters.categoryId || ''}
              onValueChange={(value) =>
                updateFilter('categoryId', value || undefined)
              }
            >
              <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="null">Uncategorized</DropdownMenuRadioItem>
              {categories.map((cat) => (
                <DropdownMenuRadioItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                    {cat.name}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Tags Filter */}
      {tags && tags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <TagIcon className="mr-1 h-3.5 w-3.5" />
              Tags
              {filters.tagIds && filters.tagIds.length > 0 && (
                <span className="ml-1 rounded bg-primary/10 px-1.5 text-xs">
                  {filters.tagIds.length}
                </span>
              )}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by tags</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={filters.tagIds?.includes(tag.id) || false}
                onCheckedChange={() => toggleTag(tag.id)}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tag.color || '#6366f1' }}
                  />
                  {tag.name}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Assignee Filter */}
      {teamMembers && teamMembers.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <User className="mr-1 h-3.5 w-3.5" />
              Assignee
              {filters.assigneeId && (
                <span className="ml-1 rounded bg-primary/10 px-1.5 text-xs">
                  {filters.assigneeId === 'unassigned'
                    ? 'None'
                    : teamMembers.find((m) => m.id === filters.assigneeId)?.firstName ||
                      teamMembers.find((m) => m.id === filters.assigneeId)?.email?.split('@')[0] ||
                      '1'}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by assignee</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filters.assigneeId || ''}
              onValueChange={(value) =>
                updateFilter('assigneeId', value || undefined)
              }
            >
              <DropdownMenuRadioItem value="">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="unassigned">Unassigned</DropdownMenuRadioItem>
              {teamMembers
                .filter((m) => m.status === 'active')
                .map((member) => (
                  <DropdownMenuRadioItem key={member.id} value={member.id}>
                    {member.firstName || member.lastName
                      ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                      : member.email}
                  </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Selected Tag Chips */}
      {filters.tagIds && filters.tagIds.length > 0 && tags && (
        <div className="flex items-center gap-1">
          {filters.tagIds.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <Badge
                key={tagId}
                variant="secondary"
                className="gap-1 pl-1.5 pr-1"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : undefined,
                  color: tag.color || undefined,
                }}
              >
                <span className="text-xs">{tag.name}</span>
                <button
                  onClick={() => removeTag(tagId)}
                  className="ml-0.5 hover:opacity-70 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

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

        {/* Additional content (e.g., Columns button) */}
        {children && (
          <div className="ml-auto flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
