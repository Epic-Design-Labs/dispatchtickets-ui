'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganizationList, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useAuth } from '@/providers';
import { teamApi } from '@/lib/api/team';
import { BrandTile } from '@/components/brand-tile';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Loader2 } from 'lucide-react';

interface OrgOption {
  id: string;
  name: string;
  imageUrl?: string | null;
}

/**
 * Switching organization lands on `/`, by a full document load.
 *
 * Going to the ROOT is the part that matters, and it is why Clerk's own
 * switcher carries `afterSelectOrganizationUrl="/"`: half the admin's URLs are
 * org-scoped, and `/brands/ws_xxx/tickets` names a brand that does not exist in
 * the organization being switched to. Staying put would land the member on
 * someone else's brand id.
 *
 * The full load rather than `router.push` is belt and braces. AuthProvider
 * already handles a switch correctly on its own -- it watches Clerk's active
 * org, clears the query cache and refetches the backend session, which is the
 * fix in 5796d1a for owner-only UI latching to the previous `orgRole`. A
 * document load simply removes the question: nothing in memory survives to be
 * stale, and switching organization is rare enough to afford it.
 */
function reloadAsNewOrg() {
  window.location.assign('/');
}

/**
 * The organization switcher as it appears on the 68px rail: the org's tile,
 * and nothing else.
 *
 * The expanded sidebar keeps Clerk's `<OrganizationSwitcher />`. This exists
 * because that component renders an avatar, a name and a chevron in a row, and
 * at 68px there is only room for the first of the three.
 *
 * Clerk CAN be told to hide the other two -- `cl-organizationPreviewTextContainer`
 * and `cl-organizationSwitcherTriggerIcon` are both real appearance elements,
 * confirmed against the live DOM, whatever an older comment here claimed. The
 * reason we don't is that what survives is Clerk's OWN avatar: the org's
 * uploaded logo, falling back to initials Clerk generates. The rail directly
 * above this is a column of `BrandTile`s wearing our identity palette, and a
 * Clerk-styled circle in that column reads as a foreign object. So the rail
 * draws its own tile from the same function every brand uses, and one person's
 * organization lands on the same colour everywhere it appears.
 */
function RailSwitcher({
  orgs,
  currentId,
  onSwitch,
  busy,
}: {
  orgs: OrgOption[];
  currentId: string | null | undefined;
  onSwitch: (orgId: string) => void;
  busy: boolean;
}) {
  // One organization is not a choice, and a control that cannot change
  // anything is just a thing to wonder about. Matches the expanded switcher,
  // which hides itself on the same rule.
  if (orgs.length < 2) return null;

  const current = orgs.find((o) => o.id === currentId) ?? orgs[0];

  return (
    // The bordered strip belongs to the switcher rather than to the sidebar,
    // so that the `null` above takes the rule with it -- a member with one
    // organization gets nothing, not an empty line across the rail.
    <div className="flex shrink-0 justify-center border-t px-2 py-2">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 w-9 p-0"
                disabled={busy}
                aria-label={`Organization: ${current.name}. Switch organization`}
              >
                {busy ? (
                  <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                ) : (
                  <BrandTile name={current.name} iconUrl={current.imageUrl} size="lg" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{current.name}</TooltipContent>
        </Tooltip>

        {/* side="right" rather than "top": the rail is against the window edge,
            so a menu above it would be clipped by the viewport on a short
            window, where to the right there is the whole page. */}
        <DropdownMenuContent className="w-56" align="end" side="right">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {orgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              className="flex cursor-pointer items-center gap-2"
              onClick={() => onSwitch(org.id)}
            >
              <BrandTile name={org.name} iconUrl={org.imageUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate">{org.name}</span>
              {org.id === current.id && <Check className="h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Clerk-authenticated members. The active organization lives in the session
 * token's `org_id` claim and the API scopes every request on it, so switching
 * has to go through Clerk's `setActive` -- our own `/auth/switch-organization`
 * would not touch the claim.
 */
export function ClerkOrgRailSwitcher() {
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  // The ACTIVE org, which the membership list does not tell us -- same claim
  // AuthProvider watches to decide a switch has happened.
  const { orgId } = useClerkAuth();
  const [switching, setSwitching] = useState(false);

  // `isLoaded` goes back to false while auth state updates, so this renders
  // nothing rather than flashing a half-built control.
  if (!isLoaded) return null;

  const memberships = userMemberships.data ?? [];
  const orgs: OrgOption[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    imageUrl: m.organization.imageUrl,
  }));

  const handleSwitch = async (nextOrgId: string) => {
    if (!setActive || nextOrgId === orgId) return;
    setSwitching(true);
    try {
      await setActive({ organization: nextOrgId });
      reloadAsNewOrg();
    } catch {
      // Leaving the spinner up would strand the rail on a failure the member
      // cannot see; the menu simply stays as it was.
      setSwitching(false);
    }
  };

  return <RailSwitcher orgs={orgs} currentId={orgId} onSwitch={handleSwitch} busy={switching} />;
}

/**
 * Legacy Stackbe-authenticated members, who have no Clerk session. Same list
 * and the same switch the expanded `OrgSwitcher` makes, drawn for the rail.
 */
export function LegacyOrgRailSwitcher() {
  const { session, switchOrganization } = useAuth();
  const [switching, setSwitching] = useState(false);

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => teamApi.listOrganizations(),
    staleTime: 5 * 60 * 1000,
  });

  if (!orgs) return null;

  const handleSwitch = async (orgId: string) => {
    if (orgId === session?.organizationId) return;
    setSwitching(true);
    try {
      await switchOrganization(orgId);
      reloadAsNewOrg();
    } catch {
      setSwitching(false);
    }
  };

  return (
    <RailSwitcher
      orgs={orgs}
      currentId={session?.organizationId}
      onSwitch={handleSwitch}
      busy={switching}
    />
  );
}
