'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBrand, useUpdateBrand } from '@/lib/hooks';
import type { EmailStyle } from '@/types/brand';
import { toast } from 'sonner';

const STYLES: { value: EmailStyle; label: string; description: string }[] = [
  {
    value: 'conversation',
    label: 'Conversation',
    description: 'Reads like a normal email from your team: the reply, who sent it, and earlier messages quoted below.',
  },
  {
    value: 'ticket',
    label: 'Ticket',
    description: 'A support-system update with a heading and the ticket number up front, including in the subject.',
  },
];

/** A few lines of what a customer sees, so the choice isn't abstract. */
function Preview({ style, brandName }: { style: EmailStyle; brandName: string }) {
  if (style === 'conversation') {
    return (
      <div className="rounded-md border bg-white p-3 text-xs leading-relaxed text-neutral-800">
        <p className="mb-1 font-medium text-neutral-500">Re: Where is my order</p>
        <p>It shipped this morning. You&apos;ll get tracking within the hour.</p>
        <p className="mt-2">
          Jamie
          <br />
          <span className="text-neutral-500">{brandName}</span>
        </p>
        <p className="mt-2 border-l-2 border-neutral-200 pl-2 text-neutral-500">On Oct 1, you wrote: Where is it?</p>
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-white p-3 text-xs leading-relaxed text-neutral-800">
      <p className="mb-1 font-medium text-neutral-500">Re: [ABC-1001] Where is my order</p>
      <p className="font-semibold">New Comment on Your Ticket</p>
      <div className="mt-1 rounded bg-neutral-100 p-2">
        <p>
          <strong>Ticket:</strong> ABC-1001 - Where is my order
        </p>
        <p>It shipped this morning. You&apos;ll get tracking within the hour.</p>
      </div>
    </div>
  );
}

export function EmailStyleCard({ brandId }: { brandId: string }) {
  const { data: brand } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);
  const current: EmailStyle = brand?.emailStyle === 'conversation' ? 'conversation' : 'ticket';

  const choose = async (value: string) => {
    if (value === current) return;
    try {
      await updateBrand.mutateAsync({ emailStyle: value as EmailStyle });
      toast.success(`Customer emails now use the ${value === 'conversation' ? 'Conversation' : 'Ticket'} style`);
    } catch {
      toast.error('Failed to change email style');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Style</CardTitle>
        <CardDescription>
          How replies, confirmations and other emails to your customers look. Emails to your own team don&apos;t change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={current}
          onValueChange={choose}
          disabled={!brand || updateBrand.isPending}
          className="grid gap-4 md:grid-cols-2"
        >
          {STYLES.map((s) => (
            <Label
              key={s.value}
              htmlFor={`email-style-${s.value}`}
              className={`flex cursor-pointer flex-col gap-3 rounded-lg border p-4 font-normal ${
                current === s.value ? 'border-primary ring-1 ring-primary' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value={s.value} id={`email-style-${s.value}`} className="mt-0.5" />
                <div className="space-y-1">
                  <span className="font-medium">{s.label}</span>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
              </div>
              <Preview style={s.value} brandName={brand?.name ?? 'Your brand'} />
            </Label>
          ))}
        </RadioGroup>
        <p className="mt-3 text-xs text-muted-foreground">
          Switching mid-conversation changes the subject line, so some mail apps will start a new thread for open tickets.
        </p>
      </CardContent>
    </Card>
  );
}
