'use client';

import { useState } from 'react';
import { useInviteMember, useBrands, useTeamMembers } from '@/lib/hooks';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrgRole } from '@/types';

/** What each invitable role can do. Owner is not invitable: it is transferred. */
export const ROLE_HELP: Record<OrgRole, string> = {
  owner: 'Full access, including billing and deleting the organization',
  admin: 'Manage brands, team members and settings',
  member: 'Work on tickets and chats in their brands',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Addresses as typed: split on commas, semicolons and whitespace, de-duplicated. */
function parseEmails(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter((e) => {
      const key = e.toLowerCase();
      if (!e || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function errorMessage(error: unknown): string | undefined {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' ? message : undefined;
}

interface InviteMemberDialogProps {
  children?: React.ReactNode;
  /** Called after at least one invite went out, so the page can show them. */
  onInvited?: () => void;
}

export function InviteMemberDialog({ children, onInvited }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [allBrands, setAllBrands] = useState(true);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const inviteMember = useInviteMember();
  const { data: brands } = useBrands();
  const { data: team } = useTeamMembers();

  const reset = () => {
    setEmails('');
    setRole('member');
    setAllBrands(true);
    setSelectedBrandIds([]);
    setError(null);
  };

  const toggleBrand = (brandId: string) =>
    setSelectedBrandIds((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]
    );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const list = parseEmails(emails);
    const onTeam = new Set(
      [...(team?.members ?? []), ...(team?.invites ?? [])].map((m) => m.email.toLowerCase())
    );
    const bad = list.filter((e) => !EMAIL.test(e));
    const already = list.filter((e) => onTeam.has(e.toLowerCase()));

    if (!list.length) return setError('Enter at least one email address.');
    if (bad.length) return setError(`Check ${bad.join(', ')}`);
    if (already.length) {
      return setError(`${already.join(', ')} ${already.length > 1 ? 'are' : 'is'} already on the team or invited.`);
    }
    if (!allBrands && selectedBrandIds.length === 0) return setError('Pick at least one brand.');
    setError(null);

    // One request per address, in turn rather than all at once: the endpoint
    // takes a single invite, and a burst of them is what a rate limiter sees.
    // A failure does not stop the rest -- one typo should not hold up five
    // colleagues -- and whatever failed stays in the box to be fixed.
    setSending(true);
    const sent: string[] = [];
    const failed: { email: string; reason?: string }[] = [];
    for (const email of list) {
      try {
        await inviteMember.mutateAsync({
          email,
          role: role as OrgRole,
          allBrands,
          brandIds: allBrands ? [] : selectedBrandIds,
        });
        sent.push(email);
      } catch (err) {
        failed.push({ email, reason: errorMessage(err) });
      }
    }
    setSending(false);

    if (sent.length) {
      toast.success(sent.length === 1 ? `Invite sent to ${sent[0]}` : `${sent.length} invites sent`);
      onInvited?.();
    }
    if (failed.length === 0) {
      setOpen(false);
      reset();
      return;
    }
    setEmails(failed.map((f) => f.email).join(', '));
    setError(
      failed.length === 1
        ? `Couldn't invite ${failed[0].email}${failed[0].reason ? `: ${failed[0].reason}` : '.'}`
        : `Couldn't invite ${failed.map((f) => f.email).join(', ')}. They're left above to try again.`
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (sending) return;
        setOpen(isOpen);
        if (!isOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        {children || (
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite people
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email with a link to join your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invite-emails">Email addresses</Label>
            <Textarea
              id="invite-emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="name@company.com, another@company.com"
              className="min-h-[76px]"
              aria-invalid={!!error}
              aria-describedby="invite-emails-help"
              autoFocus
            />
            <p id="invite-emails-help" className="text-muted-foreground text-xs">
              Separate several addresses with commas or new lines.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Role</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['member', 'admin'] as const).map((r) => (
                <label
                  key={r}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
                    role === r ? 'border-brand bg-brand-soft' : 'hover:bg-surface-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="invite-role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="accent-brand mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium capitalize">{r}</span>
                    <span className="text-muted-foreground block text-xs">{ROLE_HELP[r]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Brand access</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { all: true, title: 'All brands', help: 'Including brands created later' },
                { all: false, title: 'Selected brands', help: 'Choose below' },
              ].map((option) => (
                <label
                  key={option.title}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
                    allBrands === option.all ? 'border-brand bg-brand-soft' : 'hover:bg-surface-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="invite-brands"
                    checked={allBrands === option.all}
                    onChange={() => setAllBrands(option.all)}
                    className="accent-brand mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="text-muted-foreground block text-xs">{option.help}</span>
                  </span>
                </label>
              ))}
            </div>
            {!allBrands && (
              <div className="max-h-[200px] space-y-1 overflow-y-auto rounded-lg border p-2">
                {brands?.length ? (
                  brands.map((brand) => (
                    <label
                      key={brand.id}
                      className="hover:bg-surface-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
                    >
                      <Checkbox
                        checked={selectedBrandIds.includes(brand.id)}
                        onCheckedChange={() => toggleBrand(brand.id)}
                      />
                      {brand.name}
                    </label>
                  ))
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No brands yet. Create one first.
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send invites'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
