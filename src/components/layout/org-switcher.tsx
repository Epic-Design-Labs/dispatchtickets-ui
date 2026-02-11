'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers';
import { teamApi } from '@/lib/api/team';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';

export function OrgSwitcher() {
  const { session, switchOrganization } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => teamApi.listOrganizations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Only render if user belongs to 2+ orgs
  if (!orgs || orgs.length < 2) {
    return null;
  }

  const currentOrg = orgs.find((o) => o.id === session?.organizationId);

  const handleSwitch = async (orgId: string) => {
    if (orgId === session?.organizationId) return;
    setIsSwitching(true);
    try {
      await switchOrganization(orgId);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between text-xs text-muted-foreground h-8 px-2"
          disabled={isSwitching}
        >
          <span className="truncate">
            {isSwitching ? 'Switching...' : currentOrg?.name || 'Organization'}
          </span>
          {isSwitching ? (
            <Loader2 className="ml-1 h-3 w-3 shrink-0 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="top">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            className="cursor-pointer flex items-center justify-between"
            onClick={() => handleSwitch(org.id)}
          >
            <span className="truncate">{org.name}</span>
            {org.id === session?.organizationId && (
              <Check className="h-4 w-4 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
