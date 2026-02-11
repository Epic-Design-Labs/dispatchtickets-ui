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
import { getGravatarUrl } from '@/lib/gravatar';

export default function ProfilePage() {
  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  // Notification preferences state
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyToast, setNotifyToast] = useState(true);
  const [notifyDesktop, setNotifyDesktop] = useState(false);

  // Initialize form with profile data and sync localStorage
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setNotifyEmail(profile.notifyEmail ?? true);
      setNotifyToast(profile.notifyToast ?? true);
      setNotifyDesktop(profile.notifyDesktop ?? false);
      // Sync desktop notification setting to localStorage for the notification hook
      if (typeof window !== 'undefined') {
        localStorage.setItem('desktop_notifications_enabled', String(profile.notifyDesktop ?? false));
      }
    }
  }, [profile]);

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
    // If turning ON, first request browser permission
    if (checked) {
      // Check if browser supports notifications
      if (typeof window === 'undefined' || !('Notification' in window)) {
        toast.error('Desktop notifications are not supported in this browser');
        return;
      }

      // Check current permission status
      if (Notification.permission === 'denied') {
        toast.error('Notification permission was denied. Please enable it in your browser settings.');
        return;
      }

      // Request permission if not already granted
      if (Notification.permission !== 'granted') {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            toast.error('Notification permission is required for desktop notifications');
            return;
          }
          // Show a test notification
          new Notification('Notifications Enabled', {
            body: 'You will now receive desktop notifications for new tickets and replies.',
            icon: '/icon.svg',
          });
        } catch {
          toast.error('Failed to request notification permission');
          return;
        }
      }
    }

    // Permission granted (or turning off), update the setting
    setNotifyDesktop(checked);
    // Also sync to localStorage for the notification hook
    if (typeof window !== 'undefined') {
      localStorage.setItem('desktop_notifications_enabled', String(checked));
    }
    try {
      await updateProfile.mutateAsync({ notifyDesktop: checked });
    } catch {
      setNotifyDesktop(!checked);
      // Revert localStorage on failure
      if (typeof window !== 'undefined') {
        localStorage.setItem('desktop_notifications_enabled', String(!checked));
      }
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar';
      toast.error(message);
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
                        src={profile?.avatarUrl || (session?.email ? getGravatarUrl(session.email, 200) : undefined)}
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

      </div>
    </div>
  );
}
