'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Globe, Info, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBrand, useUpdateBrand } from '@/lib/hooks';
import { useAuth } from '@/providers';

/**
 * Turn the chat widget on and choose which sites may embed it.
 *
 * The role check here only decides what to render. The API refuses these
 * fields from anyone but owners and admins regardless (BrandsService.update).
 */
export function ChatChannelCard({ brandId }: { brandId: string }) {
  const { data: brand, isLoading } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);
  const { session } = useAuth();
  const role = (session?.orgRole ?? '').toLowerCase();
  const canManage = role === 'owner' || role === 'admin';

  const [enabled, setEnabled] = useState(false);
  const [origins, setOrigins] = useState<string[]>([]);
  const [newOrigin, setNewOrigin] = useState('');

  useEffect(() => {
    if (!brand) return;
    setEnabled(Boolean(brand.chatEnabled));
    setOrigins(brand.chatAllowedOrigins ?? []);
  }, [brand]);

  const savedEnabled = Boolean(brand?.chatEnabled);
  const savedOrigins = brand?.chatAllowedOrigins ?? [];
  const hasChanges =
    enabled !== savedEnabled || JSON.stringify(origins) !== JSON.stringify(savedOrigins);

  const addOrigin = () => {
    let url: URL;
    try {
      url = new URL(newOrigin.trim());
    } catch {
      toast.error('Enter a full URL, like https://example.com');
      return;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      toast.error('Use an http or https address');
      return;
    }
    if (url.pathname !== '/' || url.search || url.hash) {
      toast.error('Enter just the site, without a path');
      return;
    }
    if (origins.includes(url.origin)) {
      toast.error('That site is already on the list');
      return;
    }
    setOrigins([...origins, url.origin]);
    setNewOrigin('');
  };

  const save = async () => {
    try {
      await updateBrand.mutateAsync({ chatEnabled: enabled, chatAllowedOrigins: origins });
      toast.success('Chat settings saved');
    } catch {
      toast.error('Failed to save chat settings');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Chat</CardTitle>
              <CardDescription>
                Let visitors on your site start a conversation. Each conversation is a ticket.
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!canManage}
            aria-label="Enable chat"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canManage && (
          <p className="text-sm text-muted-foreground">
            Only organization owners and admins can change chat settings.
          </p>
        )}

        <div className="space-y-2">
          <Label>Sites allowed to use chat</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://www.yoursite.com"
              value={newOrigin}
              disabled={!canManage}
              onChange={(e) => setNewOrigin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOrigin();
                }
              }}
            />
            <Button variant="outline" onClick={addOrigin} disabled={!canManage || !newOrigin.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Each address your site is served from, including www and staging, without a path.
          </p>
        </div>

        {origins.length > 0 && (
          <div className="space-y-2">
            {origins.map((origin) => (
              <div
                key={origin}
                className="flex items-center justify-between bg-muted px-3 py-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <code className="text-sm">{origin}</code>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={!canManage}
                  onClick={() => setOrigins(origins.filter((o) => o !== origin))}
                  aria-label={`Remove ${origin}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {enabled && origins.length === 0 && (
          <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Chat is on, but no site is allowed yet, so no visitor can connect. Add your site above.</p>
          </div>
        )}

        <div className="flex gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Visitors are anonymous. If one types an email address, agents see it marked
            unverified, and replies are never sent to it: anyone can type anyone&apos;s address.
            A reply reaches the visitor while they&apos;re on your site, and waits in the
            conversation if they&apos;ve left.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
            </p>
            <Button onClick={save} disabled={updateBrand.isPending || !hasChanges}>
              {updateBrand.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
