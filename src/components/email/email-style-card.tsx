'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { brandsApi, type EmailPreview } from '@/lib/api/brands';
import type { Brand, EmailStyle, UpdateBrandInput } from '@/types/brand';

const STYLES: { value: EmailStyle; label: string; description: string }[] = [
  {
    value: 'conversation',
    label: 'Conversation',
    description: 'Reads like a normal email from your team: the reply, who sent it, earlier messages quoted below.',
  },
  {
    value: 'ticket',
    label: 'Ticket',
    description: 'A support-system update with a heading and the ticket number up front, including in the subject.',
  },
];

const ACCENT = /^#[0-9a-f]{6}$/i;

export interface EmailStyleForm {
  style: EmailStyle;
  logoUrl: string;
  accentColor: string;
  signature: string;
  footer: string;
  showTicketNumber: boolean;
  showHistory: boolean;
}

type Form = EmailStyleForm;

/** Same checks the API makes, so the preview and Save agree. */
export function emailStyleProblem(form: Form): string | null {
  if (form.logoUrl.trim() && !/^https:\/\/\S+$/i.test(form.logoUrl.trim())) return 'Logo URL must start with https://';
  if (form.accentColor.trim() && !ACCENT.test(form.accentColor.trim())) return 'Accent color must look like #1d4ed8';
  return null;
}

/** The saved appearance, as the form reads it. */
export function emailStyleOf(brand: Brand): Form {
  return {
    style: brand.emailStyle === 'conversation' ? 'conversation' : 'ticket',
    logoUrl: brand.emailLogoUrl ?? '',
    accentColor: brand.emailAccentColor ?? '',
    signature: brand.emailSignature ?? '',
    footer: brand.emailFooter ?? '',
    showTicketNumber: brand.emailShowTicketNumber ?? true,
    showHistory: brand.emailShowHistory ?? true,
  };
}

/** What Save sends. Blank text clears the field; the API stores null. */
export function emailStylePayload(form: Form): UpdateBrandInput {
  return {
    emailStyle: form.style,
    emailLogoUrl: form.logoUrl.trim() || null,
    emailAccentColor: form.accentColor.trim() || null,
    emailSignature: form.signature.trim() || null,
    emailFooter: form.footer.trim() || null,
    emailShowTicketNumber: form.showTicketNumber,
    emailShowHistory: form.showHistory,
  };
}

/**
 * Whether the form differs from what is saved, compared the way Save writes
 * it -- trimmed -- so a trailing space cannot keep the page looking unsaved.
 */
export function emailStyleChanged(saved: Form, form: Form): boolean {
  return (Object.keys(saved) as (keyof Form)[]).some((key) => {
    const a = saved[key];
    const b = form[key];
    return typeof a === 'string' && typeof b === 'string' ? a.trim() !== b.trim() : a !== b;
  });
}

/**
 * How customer emails look. Controlled: the settings page owns the draft so
 * one save bar covers this card and the rest of the page, rather than the
 * card carrying a second Save button that saved only half of what was edited.
 */
export function EmailStyleCard({
  brandId,
  brandName,
  form,
  onChange,
}: {
  brandId: string;
  /** Shown as the signature's placeholder: what customers see when it is blank. */
  brandName?: string;
  form: Form;
  onChange: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) {
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewError, setPreviewError] = useState(false);

  // Re-render the preview a moment after the form stops changing. The page
  // memoises form, so this fires on an edit here, not on every page render.
  useEffect(() => {
    if (emailStyleProblem(form)) return;
    let cancelled = false;
    const t = setTimeout(() => {
      brandsApi
        .emailPreview(brandId, {
          style: form.style,
          logoUrl: form.logoUrl.trim(),
          accentColor: form.accentColor.trim(),
          signature: form.signature,
          footer: form.footer,
          showTicketNumber: form.showTicketNumber,
          showHistory: form.showHistory,
        })
        .then((p) => {
          if (cancelled) return;
          setPreview(p);
          setPreviewError(false);
        })
        .catch(() => !cancelled && setPreviewError(true));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [brandId, form]);

  const set = onChange;
  const problem = emailStyleProblem(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Appearance</CardTitle>
        <CardDescription>
          How replies, confirmations and other emails to your customers look. Emails to your own team don&apos;t change.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Style</Label>
            <RadioGroup value={form.style} onValueChange={(v) => set('style', v as EmailStyle)} className="space-y-2">
              {STYLES.map((s) => (
                <Label
                  key={s.value}
                  htmlFor={`email-style-${s.value}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal ${
                    form.style === s.value ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                >
                  <RadioGroupItem value={s.value} id={`email-style-${s.value}`} className="mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-medium">{s.label}</span>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-logo">Logo URL</Label>
            <Input
              id="email-logo"
              placeholder="https://example.com/logo.png"
              value={form.logoUrl}
              onChange={(e) => set('logoUrl', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Shown at the top, up to 200×48. Leave empty for no logo.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-accent">Accent color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pick accent color"
                className="h-9 w-12 cursor-pointer rounded border bg-transparent p-1"
                value={ACCENT.test(form.accentColor) ? form.accentColor : '#0066cc'}
                onChange={(e) => set('accentColor', e.target.value)}
              />
              <Input
                id="email-accent"
                placeholder="#0066cc"
                className="w-32 font-mono"
                value={form.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
              />
              {form.accentColor && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set('accentColor', '')}>
                  Reset
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Links and buttons.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-signature">Brand signature</Label>
            <Textarea
              id="email-signature"
              rows={3}
              maxLength={1000}
              placeholder={brandName ?? 'Your brand'}
              value={form.signature}
              onChange={(e) => set('signature', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Under the agent&apos;s name, in place of the brand name. Each agent can add their own in their profile.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-footer">Footer</Label>
            <Textarea
              id="email-footer"
              rows={2}
              maxLength={1000}
              placeholder="e.g. your address or support hours"
              value={form.footer}
              onChange={(e) => set('footer', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="email-ticket-number">Show ticket number</Label>
              <p className="text-sm text-muted-foreground">A small &quot;Ref&quot; line at the bottom (Conversation style).</p>
            </div>
            <Switch
              id="email-ticket-number"
              checked={form.showTicketNumber}
              onCheckedChange={(v) => set('showTicketNumber', v)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="email-history">Include earlier messages</Label>
              <p className="text-sm text-muted-foreground">Quote the conversation so far under each reply.</p>
            </div>
            <Switch id="email-history" checked={form.showHistory} onCheckedChange={(v) => set('showHistory', v)} />
          </div>

          {problem && <p className="text-sm text-destructive">{problem}</p>}
          <p className="text-xs text-muted-foreground">
            Switching style mid-conversation changes the subject line, so some mail apps start a new thread.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="truncate">
                <span className="font-medium text-foreground">From:</span> {preview?.from ?? '…'}
              </div>
              <div className="truncate">
                <span className="font-medium text-foreground">Subject:</span> {preview?.subject ?? '…'}
              </div>
            </div>
            {previewError ? (
              <p className="p-4 text-sm text-muted-foreground">Couldn&apos;t load the preview.</p>
            ) : (
              // sandbox with no permissions: the email HTML can't run script or navigate the app.
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={`<!doctype html><html><body style="margin:16px;background:#fff">${preview?.html ?? ''}</body></html>`}
                className="h-[520px] w-full bg-white"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">A sample reply to a customer, with your unsaved changes.</p>
        </div>
      </CardContent>
    </Card>
  );
}
