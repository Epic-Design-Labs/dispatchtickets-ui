'use client';

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { SignedIn, SignedOut, useClerk } from '@clerk/nextjs';
import { chatSoundEnabled, setChatSoundEnabled, subscribeChatSound } from '@/lib/live/chime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SettingsSaveBar } from '@/components/settings/settings-save-bar';
import { PRESENCE_LABELS, PresenceDot } from '@/components/presence/presence-dot';
import { useProfile, useUpdateProfile, useUploadAvatar, useDeleteAvatar } from '@/lib/hooks';
import { useMyPresence, useSetMyPresence } from '@/lib/hooks/use-presence';
import type { PresenceStatus } from '@/lib/api/presence';
import { useAuth } from '@/providers';
import { clearSessionToken } from '@/providers/auth-provider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getGravatarUrl } from '@/lib/gravatar';
import { cn } from '@/lib/utils';

/**
 * What the Save button keeps. Photo, availability and chat sound are not in it:
 * a photo is an upload that has already happened, availability is the same
 * live switch as the sidebar's, and chat sound belongs to this browser.
 */
type Draft = {
  displayName: string;
  emailSignature: string;
  notifyEmail: boolean;
  notifyToast: boolean;
  notifyDesktop: boolean;
};

/**
 * Worded from what the API does with each status (chat.service.ts): Available
 * and Busy both count as someone being here, so the widget stays open; if
 * nobody on the brand is either, visitors are told the team is away.
 */
const AVAILABILITY: { status: PresenceStatus; hint: string }[] = [
  { status: 'available', hint: 'You’re here to take chats' },
  { status: 'busy', hint: 'You’re here, but occupied' },
  { status: 'away', hint: 'Not counted as here for chats' },
  { status: 'offline', hint: 'Also happens on its own when you close Dispatch' },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card space-y-4 rounded-xl border p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="text-muted-foreground mt-0.5 block text-xs">{hint}</span>}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function initialsOf(name: string, email?: string) {
  if (name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email ? email.slice(0, 2).toUpperCase() : '?';
}

export default function ProfilePage() {
  const { session, logout } = useAuth();
  const clerk = useClerk();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const { data: presence } = useMyPresence();
  const setPresence = useSetMyPresence();

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Edits only; null means "showing what is saved". The saved values are read
  // straight from the profile query, which a successful save updates in place.
  const [edits, setEdits] = useState<Draft | null>(null);
  // Chat sound is per browser (lib/live/chime.ts), not a profile field.
  const chatSound = useSyncExternalStore(subscribeChatSound, chatSoundEnabled, () => true);

  const saved = useMemo<Draft | null>(
    () =>
      profile
        ? {
            displayName: profile.displayName || '',
            emailSignature: profile.emailSignature || '',
            notifyEmail: profile.notifyEmail ?? true,
            notifyToast: profile.notifyToast ?? true,
            notifyDesktop: profile.notifyDesktop ?? false,
          }
        : null,
    [profile]
  );
  const draft = edits ?? saved;

  // The notification hook reads this flag, not the profile (CLAUDE.md note 12).
  useEffect(() => {
    if (saved) localStorage.setItem('desktop_notifications_enabled', String(saved.notifyDesktop));
  }, [saved]);

  const dirty = !!edits && !!saved && JSON.stringify(edits) !== JSON.stringify(saved);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setEdits((e) => {
      const base = e ?? saved;
      return base ? { ...base, [key]: value } : e;
    });

  // Permission has to be asked during the click, so it is asked when the switch
  // is turned on, not later at Save. Saying no leaves the switch off.
  const handleDesktopChange = async (checked: boolean) => {
    if (!checked) return set('notifyDesktop', false);
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Desktop notifications are not supported in this browser');
      return;
    }
    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked for this site. Allow them in your browser settings first.');
      return;
    }
    if (Notification.permission !== 'granted') {
      try {
        if ((await Notification.requestPermission()) !== 'granted') {
          toast.error('Your browser needs to allow notifications for this to work');
          return;
        }
      } catch {
        toast.error('Could not ask your browser for permission');
        return;
      }
    }
    set('notifyDesktop', true);
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateProfile.mutateAsync({
        displayName: draft.displayName.trim() || undefined,
        // Empty clears it, so send it as-is (the API stores '' as no signature).
        emailSignature: draft.emailSignature,
        notifyEmail: draft.notifyEmail,
        notifyToast: draft.notifyToast,
        notifyDesktop: draft.notifyDesktop,
      });
      // The mutation has already written the reply into the profile query.
      setEdits(null);
      toast.success('Profile saved');
    } catch {
      toast.error('Could not save your profile');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, GIF or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('The image must be under 5 MB');
      return;
    }
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload the photo');
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar.mutateAsync();
      toast.success('Photo removed');
    } catch {
      toast.error('Could not remove the photo');
    }
  };

  const chooseAvailability = (status: PresenceStatus) =>
    setPresence.mutate(status, {
      onSuccess: () => toast.success(`You’re now ${PRESENCE_LABELS[status].toLowerCase()}`),
      onError: () => toast.error('Could not update your availability'),
    });

  if (isLoading || !draft) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const email = session?.email;
  const hasCustomAvatar = !!profile?.avatarUrl && !profile.avatarUrl.includes('gravatar.com');
  const intended = presence?.intendedStatus;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile settings</h1>
        <p className="text-muted-foreground">
          How you appear to your team and customers, and how Dispatch notifies you.
        </p>
      </div>

      <Section title="Profile" description="Shown on your replies and notes, and in team lists.">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={profile?.avatarUrl || (email ? getGravatarUrl(email, 200) : undefined)}
              alt=""
            />
            <AvatarFallback className="text-xl">{initialsOf(draft.displayName, email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{draft.displayName.trim() || email}</p>
            <div className="mt-2 flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Upload photo
              </Button>
              {hasCustomAvatar && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAvatar}
                  disabled={deleteAvatar.isPending}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              placeholder="e.g. Jamie Lee"
              value={draft.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email ?? ''} disabled />
            <SignedIn>
              <p className="text-muted-foreground text-xs">
                Change it in{' '}
                <button type="button" className="underline" onClick={() => clerk.openUserProfile()}>
                  your account
                </button>
                .
              </p>
            </SignedIn>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailSignature">Email signature</Label>
          <Textarea
            id="emailSignature"
            placeholder={'e.g.\nJamie Lee\nCustomer Support'}
            value={draft.emailSignature}
            onChange={(e) => set('emailSignature', e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <p className="text-muted-foreground text-xs">
            Goes under your replies to customers, in place of your name. Leave it empty to use your name.
          </p>
        </div>
      </Section>

      <Section
        title="Availability"
        description="Applies on every brand you cover. Changes take effect straight away."
      >
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Availability">
          {AVAILABILITY.map(({ status, hint }) => {
            const on = intended === status;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => chooseAvailability(status)}
                disabled={setPresence.isPending}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                  on ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                )}
              >
                <PresenceDot status={status} className="mt-1.5 h-2.5 w-2.5" />
                <span>
                  <span className="block text-sm font-medium">{PRESENCE_LABELS[status]}</span>
                  <span className="text-muted-foreground block text-xs">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        {intended === 'mixed' && (
          <p className="text-muted-foreground text-xs">
            You have different statuses on different brands. Choosing one here sets it everywhere.
          </p>
        )}
      </Section>

      <Section
        title="Notifications"
        description="Only for brands you have access to."
      >
        <ToggleRow
          id="notify-email"
          label="Email"
          hint="When tickets are created or customers reply"
          checked={draft.notifyEmail}
          onChange={(v) => set('notifyEmail', v)}
        />
        <div className="bg-border h-px" />
        <ToggleRow
          id="notify-toast"
          label="In-app pop-ups"
          hint="A message in the corner while you’re using Dispatch"
          checked={draft.notifyToast}
          onChange={(v) => set('notifyToast', v)}
        />
        <ToggleRow
          id="notify-desktop"
          label="Desktop notifications"
          hint="From your computer, even when this tab is in the background"
          checked={draft.notifyDesktop}
          onChange={handleDesktopChange}
        />
        <ToggleRow
          id="chat-sound"
          label="Play a sound for new chats"
          hint="This browser only. Saves straight away."
          checked={chatSound}
          onChange={setChatSoundEnabled}
        />
      </Section>

      <Section title="Security">
        <SignedIn>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Password and two-step verification</p>
              <p className="text-muted-foreground text-xs">Managed in your account</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => clerk.openUserProfile()}>
              Manage
            </Button>
          </div>
        </SignedIn>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-muted-foreground text-xs">Of Dispatch on this browser</p>
          </div>
          <SignedIn>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                // The API client sends a legacy session token ahead of Clerk's,
                // so one left in this browser would outlive the Clerk sign-out.
                clearSessionToken();
                void clerk.signOut({ redirectUrl: '/login' });
              }}
            >
              Sign out
            </Button>
          </SignedIn>
          <SignedOut>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={logout}>
              Sign out
            </Button>
          </SignedOut>
        </div>
      </Section>

      <SettingsSaveBar
        dirty={dirty}
        saving={updateProfile.isPending}
        onSave={handleSave}
        onDiscard={() => setEdits(null)}
      />
    </div>
  );
}
