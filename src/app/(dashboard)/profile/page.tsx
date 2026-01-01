'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile, useUpdateProfile } from '@/lib/hooks';
import { useAuth } from '@/providers';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { session } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setAvatarUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProfile.mutateAsync({
        displayName: displayName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Your display name and avatar are shown on comments and throughout the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} alt={displayName || session?.email || 'Avatar'} />
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{displayName || session?.email}</p>
                <p>{session?.email}</p>
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

            {/* Avatar URL */}
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Profile Image URL (optional)</Label>
              <Input
                id="avatarUrl"
                type="url"
                placeholder="https://example.com/your-photo.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Enter a URL to your profile picture. Leave blank to use your initials.
              </p>
            </div>

            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
