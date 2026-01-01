'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useProfile, useUpdateProfile, useUploadAvatar, useDeleteAvatar } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { toast } from 'sonner';
import { Camera, Trash2, Loader2 } from 'lucide-react';

// Simple MD5 hash for Gravatar
function md5(string: string): string {
  function rotateLeft(value: number, shift: number) {
    return (value << shift) | (value >>> (32 - shift));
  }
  function addUnsigned(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    return ((((x >>> 16) + (y >>> 16) + (lsw >>> 16)) << 16) | (lsw & 0xffff)) >>> 0;
  }
  function f(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function g(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function h(x: number, y: number, z: number) { return x ^ y ^ z; }
  function i(x: number, y: number, z: number) { return y ^ (x | ~z); }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, f(b, c, d)), addUnsigned(x, t)), s), b);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, g(b, c, d)), addUnsigned(x, t)), s), b);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, h(b, c, d)), addUnsigned(x, t)), s), b);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, i(b, c, d)), addUnsigned(x, t)), s), b);
  }
  const x: number[] = [];
  let k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  const bytes = new TextEncoder().encode(string);
  const len = bytes.length;
  for (k = 0; k < len + 8; k += 4) x[k >> 2] = 0;
  for (k = 0; k < len; k++) x[k >> 2] |= bytes[k] << ((k % 4) * 8);
  x[k >> 2] |= 0x80 << ((k % 4) * 8);
  x[(((len + 8) >> 6) << 4) + 14] = len * 8;
  a = 0x67452301; b = 0xefcdab89; c = 0x98badcfe; d = 0x10325476;
  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = ff(a, b, c, d, x[k], S11, 0xd76aa478); d = ff(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = ff(c, d, a, b, x[k + 2], S13, 0x242070db); b = ff(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = ff(a, b, c, d, x[k + 4], S11, 0xf57c0faf); d = ff(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = ff(c, d, a, b, x[k + 6], S13, 0xa8304613); b = ff(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = ff(a, b, c, d, x[k + 8], S11, 0x698098d8); d = ff(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = ff(c, d, a, b, x[k + 10], S13, 0xffff5bb1); b = ff(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = ff(a, b, c, d, x[k + 12], S11, 0x6b901122); d = ff(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = ff(c, d, a, b, x[k + 14], S13, 0xa679438e); b = ff(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = gg(a, b, c, d, x[k + 1], S21, 0xf61e2562); d = gg(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = gg(c, d, a, b, x[k + 11], S23, 0x265e5a51); b = gg(b, c, d, a, x[k], S24, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[k + 5], S21, 0xd62f105d); d = gg(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = gg(c, d, a, b, x[k + 15], S23, 0xd8a1e681); b = gg(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[k + 9], S21, 0x21e1cde6); d = gg(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = gg(c, d, a, b, x[k + 3], S23, 0xf4d50d87); b = gg(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = gg(a, b, c, d, x[k + 13], S21, 0xa9e3e905); d = gg(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = gg(c, d, a, b, x[k + 7], S23, 0x676f02d9); b = gg(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = hh(a, b, c, d, x[k + 5], S31, 0xfffa3942); d = hh(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = hh(c, d, a, b, x[k + 11], S33, 0x6d9d6122); b = hh(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = hh(a, b, c, d, x[k + 1], S31, 0xa4beea44); d = hh(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = hh(c, d, a, b, x[k + 7], S33, 0xf6bb4b60); b = hh(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = hh(a, b, c, d, x[k + 13], S31, 0x289b7ec6); d = hh(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = hh(c, d, a, b, x[k + 3], S33, 0xd4ef3085); b = hh(b, c, d, a, x[k + 6], S34, 0x04881d05);
    a = hh(a, b, c, d, x[k + 9], S31, 0xd9d4d039); d = hh(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = hh(c, d, a, b, x[k + 15], S33, 0x1fa27cf8); b = hh(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = ii(a, b, c, d, x[k], S41, 0xf4292244); d = ii(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = ii(c, d, a, b, x[k + 14], S43, 0xab9423a7); b = ii(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = ii(a, b, c, d, x[k + 12], S41, 0x655b59c3); d = ii(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = ii(c, d, a, b, x[k + 10], S43, 0xffeff47d); b = ii(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = ii(a, b, c, d, x[k + 8], S41, 0x6fa87e4f); d = ii(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = ii(c, d, a, b, x[k + 6], S43, 0xa3014314); b = ii(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = ii(a, b, c, d, x[k + 4], S41, 0xf7537e82); d = ii(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = ii(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb); b = ii(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
  }
  const toHex = (n: number) => ('0' + (n & 0xff).toString(16)).slice(-2) + ('0' + ((n >> 8) & 0xff).toString(16)).slice(-2) + ('0' + ((n >> 16) & 0xff).toString(16)).slice(-2) + ('0' + ((n >> 24) & 0xff).toString(16)).slice(-2);
  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

// Generate Gravatar URL from email
function getGravatarUrl(email: string, size: number = 200): string {
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

export default function ProfilePage() {
  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(false);

  // Notification preferences state
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyToast, setNotifyToast] = useState(true);
  const [notifyDesktop, setNotifyDesktop] = useState(true);

  // Check notification support and permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      // Check if user has enabled desktop notifications in localStorage
      const enabled = localStorage.getItem('desktop_notifications_enabled') === 'true';
      setDesktopNotificationsEnabled(enabled && Notification.permission === 'granted');
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setNotifyEmail(profile.notifyEmail ?? true);
      setNotifyToast(profile.notifyToast ?? true);
      setNotifyDesktop(profile.notifyDesktop ?? true);
    }
  }, [profile]);

  const handleEnableNotifications = async () => {
    if (notificationPermission === 'unsupported') {
      toast.error('Desktop notifications are not supported in this browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        setDesktopNotificationsEnabled(true);
        localStorage.setItem('desktop_notifications_enabled', 'true');
        // Show a test notification
        new Notification('Notifications Enabled', {
          body: 'You will now receive desktop notifications for new tickets and replies.',
          icon: '/icon.svg',
        });
        toast.success('Desktop notifications enabled');
      } else if (permission === 'denied') {
        toast.error('Notification permission denied. You can enable it in your browser settings.');
      }
    } catch {
      toast.error('Failed to request notification permission');
    }
  };

  const handleToggleNotifications = (enabled: boolean) => {
    setDesktopNotificationsEnabled(enabled);
    localStorage.setItem('desktop_notifications_enabled', enabled ? 'true' : 'false');
    if (enabled) {
      toast.success('Desktop notifications enabled');
    } else {
      toast.success('Desktop notifications disabled');
    }
  };

  const handleNotifyEmailChange = async (checked: boolean) => {
    setNotifyEmail(checked);
    try {
      await updateProfile.mutateAsync({ notifyEmail: checked });
    } catch {
      setNotifyEmail(!checked);
      toast.error('Failed to update notification preference');
    }
  };

  const handleNotifyToastChange = async (checked: boolean) => {
    setNotifyToast(checked);
    try {
      await updateProfile.mutateAsync({ notifyToast: checked });
    } catch {
      setNotifyToast(!checked);
      toast.error('Failed to update notification preference');
    }
  };

  const handleNotifyDesktopChange = async (checked: boolean) => {
    setNotifyDesktop(checked);
    try {
      await updateProfile.mutateAsync({ notifyDesktop: checked });
    } catch {
      setNotifyDesktop(!checked);
      toast.error('Failed to update notification preference');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile.mutateAsync({
        displayName: displayName.trim() || undefined,
      });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      await uploadAvatar.mutateAsync(file);
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatar.mutateAsync();
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
    }
  };

  // Get initials from email
  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (session?.email) {
      return session.email.slice(0, 2).toUpperCase();
    }
    return '?';
  };

  // Check if user has a custom avatar (not Gravatar)
  const hasCustomAvatar = profile?.avatarUrl && !profile.avatarUrl.includes('gravatar.com');
  const isUploading = uploadAvatar.isPending;
  const isDeleting = deleteAvatar.isPending;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal profile settings
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Your display name and avatar are shown on comments and throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-start gap-4">
                <div className="relative group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                    className="relative block rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <Avatar className="h-20 w-20 cursor-pointer">
                      <AvatarImage
                        src={profile?.avatarUrl || (session?.email ? getGravatarUrl(session.email) : undefined)}
                        alt={displayName || session?.email || 'Avatar'}
                      />
                      <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                    </Avatar>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{displayName || session?.email}</p>
                  <p className="text-sm text-muted-foreground">{session?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click avatar to upload a new photo
                  </p>
                  {hasCustomAvatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-destructive hover:text-destructive"
                      onClick={handleDeleteAvatar}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Remove photo
                    </Button>
                  )}
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Kal, Julio, Sarah"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
                <p className="text-sm text-muted-foreground">
                  This name will be shown on comments you add to tickets
                </p>
              </div>

              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notification Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose how you want to be notified about new tickets and customer replies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-email">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email when tickets are created or customers reply
                </p>
              </div>
              <Switch
                id="notify-email"
                checked={notifyEmail}
                onCheckedChange={handleNotifyEmailChange}
                disabled={updateProfile.isPending}
              />
            </div>

            {/* Toast notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-toast">In-App Toast Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show toast notifications within the app
                </p>
              </div>
              <Switch
                id="notify-toast"
                checked={notifyToast}
                onCheckedChange={handleNotifyToastChange}
                disabled={updateProfile.isPending}
              />
            </div>

            {/* Desktop notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-desktop">Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show system notifications outside the browser
                </p>
              </div>
              <Switch
                id="notify-desktop"
                checked={notifyDesktop}
                onCheckedChange={handleNotifyDesktopChange}
                disabled={updateProfile.isPending}
              />
            </div>

            {/* Note about brand filtering */}
            <div className="rounded-lg border border-dashed p-3 mt-4">
              <p className="text-sm text-muted-foreground">
                You'll only receive notifications for brands you're assigned to.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Browser Notification Permission Card */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Permissions</CardTitle>
            <CardDescription>
              Enable browser notifications to receive alerts outside this tab
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationPermission === 'unsupported' ? (
              <p className="text-sm text-muted-foreground">
                Desktop notifications are not supported in this browser.
              </p>
            ) : notificationPermission === 'denied' ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Notification permission was denied. To enable notifications, you'll need to:
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li>Click the lock/info icon in your browser's address bar</li>
                  <li>Find "Notifications" and change it to "Allow"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            ) : notificationPermission === 'granted' ? (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktop-notifications">Browser Permission</Label>
                  <p className="text-sm text-muted-foreground">
                    Permission granted - desktop notifications will work when enabled above
                  </p>
                </div>
                <Switch
                  id="desktop-notifications"
                  checked={desktopNotificationsEnabled}
                  onCheckedChange={handleToggleNotifications}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enable browser notification permission to receive alerts even when you're in another tab.
                </p>
                <Button onClick={handleEnableNotifications} variant="outline">
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Enable Browser Notifications
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
