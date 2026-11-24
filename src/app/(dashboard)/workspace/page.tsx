'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrands, useOrganization, useTeamMembers, useUpdateOrganization } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { DeleteAccountSection } from '@/components/workspace/delete-account-section';
import { cn } from '@/lib/utils';

function OnOff({ on, href, label }: { on?: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={`${label}: ${on ? 'on' : 'off'}. Open settings`}
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium hover:underline',
        on ? 'bg-success-soft text-success-foreground' : 'bg-secondary text-muted-foreground',
      )}
    >
      {on ? 'On' : 'Off'}
    </Link>
  );
}

export default function WorkspaceSettingsPage() {
  const { session } = useAuth();
  const isOwner = session?.orgRole === 'owner';
  const { data: org, isLoading: orgLoading } = useOrganization();
  const { data: team, isLoading: teamLoading } = useTeamMembers();
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const updateOrg = useUpdateOrganization();

  // Null until the owner types, so the field tracks the saved name otherwise.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? org?.name ?? '';
  const changed = draft !== null && draft.trim() !== (org?.name ?? '');

  const members = team?.members ?? [];
  const ownerMember = members.find((m) => m.role === 'owner');
  const ownerName = ownerMember
    ? [ownerMember.firstName, ownerMember.lastName].filter(Boolean).join(' ').trim() || ownerMember.email
    : null;
  const brandList = [...(brands ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  const save = async () => {
    if (!name.trim()) {
      toast.error('Add a name for the workspace');
      return;
    }
    try {
      await updateOrg.mutateAsync(name.trim());
      setDraft(null);
      toast.success('Workspace name saved');
    } catch {
      toast.error('Could not save the workspace name');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace settings</h1>
        <p className="text-muted-foreground">
          Applies to every brand and teammate{org?.name ? ` in ${org.name}` : ''}.
        </p>
      </div>

      {/* General */}
      <section className="bg-card rounded-xl border">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">General</h2>
        </div>
        <div className="space-y-5 p-5">
          <div className="flex items-center gap-4">
            <span className="bg-secondary text-muted-foreground flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
              <Building2 className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              {orgLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <p className="truncate font-semibold">{org?.name}</p>
              )}
              {teamLoading || brandsLoading ? (
                <Skeleton className="mt-1 h-4 w-32" />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {members.length} {members.length === 1 ? 'member' : 'members'} · {brandList.length}{' '}
                  {brandList.length === 1 ? 'brand' : 'brands'}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 sm:max-w-sm">
            <Label htmlFor="workspaceName">Workspace name</Label>
            {orgLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <div className="flex gap-2">
                <Input
                  id="workspaceName"
                  value={name}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!isOwner}
                  placeholder="e.g. Acme Support"
                />
                {isOwner && changed && (
                  <Button onClick={save} disabled={updateOrg.isPending}>
                    {updateOrg.isPending ? 'Saving…' : 'Save'}
                  </Button>
                )}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              {isOwner
                ? 'Shown in invite emails and team lists.'
                : `Only the owner${ownerName ? ` (${ownerName})` : ''} can rename the workspace.`}
            </p>
          </div>
        </div>
      </section>

      {/* Per-brand settings */}
      <section className="bg-card rounded-xl border">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Brand settings</h2>
          <p className="text-muted-foreground text-sm">
            Business hours, response targets, satisfaction surveys and ticket numbers are set for each
            brand, so every brand can keep its own.
          </p>
        </div>
        {brandsLoading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : brandList.length === 0 ? (
          <p className="text-muted-foreground p-5 text-sm">
            No brands yet. <Link href="/brands" className="text-foreground underline">Create one</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="px-5 py-2 font-medium">Brand</th>
                  <th className="px-3 py-2 font-medium">Ticket prefix</th>
                  <th className="px-3 py-2 font-medium">Response targets</th>
                  <th className="px-3 py-2 font-medium">Surveys</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {brandList.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="max-w-[14rem] truncate px-5 py-2.5 font-medium">{b.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{b.ticketPrefix || '—'}</td>
                    <td className="px-3 py-2.5">
                      <OnOff
                        on={b.slaEnabled}
                        href={`/brands/${b.id}/settings/sla`}
                        label={`${b.name} response targets`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <OnOff
                        on={b.csatEnabled}
                        href={`/brands/${b.id}/settings/satisfaction`}
                        label={`${b.name} satisfaction surveys`}
                      />
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link
                        href={`/brands/${b.id}/settings`}
                        className="text-muted-foreground hover:text-foreground text-xs underline"
                      >
                        Settings
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DeleteAccountSection isOwner={isOwner} workspaceName={org?.name} />
    </div>
  );
}
