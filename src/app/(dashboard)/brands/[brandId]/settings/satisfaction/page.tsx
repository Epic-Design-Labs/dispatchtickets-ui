'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrand, useUpdateBrand } from '@/lib/hooks';
import { CsatType } from '@/types';
import { toast } from 'sonner';
import { ThumbsUp, Star, Hash, Copy, MessageSquare } from 'lucide-react';

const DEFAULT_CSAT_SUBJECT = 'How was your support experience?';
const DEFAULT_CSAT_BODY = `Your ticket has been resolved and we'd love to hear your feedback.

Click the button below to rate your experience.

Thank you for helping us improve!`;

const DELAY_OPTIONS = [
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: '1440', label: '24 hours' },
];

export default function SatisfactionSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: brand, isLoading } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);

  // CSAT settings state
  const [csatEnabled, setCsatEnabled] = useState(false);
  const [csatType, setCsatType] = useState<CsatType>('thumbs');
  const [csatDelayMinutes, setCsatDelayMinutes] = useState('60');
  const [csatEmailSubject, setCsatEmailSubject] = useState('');
  const [csatEmailBody, setCsatEmailBody] = useState('');

  // Initialize form with brand data
  useEffect(() => {
    if (brand) {
      setCsatEnabled(brand.csatEnabled || false);
      setCsatType(brand.csatType || 'thumbs');
      setCsatDelayMinutes(String(brand.csatDelayMinutes || 60));
      setCsatEmailSubject(brand.csatEmailSubject || '');
      setCsatEmailBody(brand.csatEmailBody || '');
    }
  }, [brand]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSaveCsatSettings = async () => {
    try {
      await updateBrand.mutateAsync({
        csatEnabled,
        csatType,
        csatDelayMinutes: parseInt(csatDelayMinutes, 10),
        csatEmailSubject: csatEmailSubject.trim() || null,
        csatEmailBody: csatEmailBody.trim() || null,
      });
      toast.success('Satisfaction survey settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CSAT Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Customer Satisfaction (CSAT) Surveys
          </CardTitle>
          <CardDescription>
            Automatically request feedback from customers after their tickets are resolved
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="csat-enabled">Enable satisfaction surveys</Label>
              <p className="text-sm text-muted-foreground">
                Send a rating request email when tickets are resolved
              </p>
            </div>
            <Switch
              id="csat-enabled"
              checked={csatEnabled}
              onCheckedChange={(enabled) => {
                setCsatEnabled(enabled);
                // Set default content when enabling if fields are empty
                if (enabled) {
                  if (!csatEmailSubject.trim()) {
                    setCsatEmailSubject(DEFAULT_CSAT_SUBJECT);
                  }
                  if (!csatEmailBody.trim()) {
                    setCsatEmailBody(DEFAULT_CSAT_BODY);
                  }
                }
              }}
            />
          </div>

          {csatEnabled && (
            <>
              <Separator />

              {/* Rating Type Selection */}
              <div className="space-y-3">
                <Label>Rating type</Label>
                <RadioGroup
                  value={csatType}
                  onValueChange={(v) => setCsatType(v as CsatType)}
                  className="grid gap-3"
                >
                  <div className="flex items-start space-x-3 p-3 rounded-lg border">
                    <RadioGroupItem value="thumbs" id="type-thumbs" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="type-thumbs" className="font-medium cursor-pointer flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4" />
                        Thumbs Up / Down
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Simple binary feedback - great for quick responses
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border">
                    <RadioGroupItem value="scale5" id="type-scale5" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="type-scale5" className="font-medium cursor-pointer flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        5-Star Rating
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Classic star rating from 1 to 5
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg border">
                    <RadioGroupItem value="scale10" id="type-scale10" className="mt-1" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="type-scale10" className="font-medium cursor-pointer flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        1-10 Scale
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Net Promoter Score (NPS) style scale
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Delay Setting */}
              <div className="space-y-2">
                <Label htmlFor="csat-delay">Send survey after</Label>
                <Select value={csatDelayMinutes} onValueChange={setCsatDelayMinutes}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select delay" />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Wait time after ticket resolution before sending the survey email
                </p>
              </div>

              <Separator />

              {/* Email Customization */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Email Customization</Label>
                  <p className="text-sm text-muted-foreground">
                    Customize the survey request email (optional)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csat-subject">Email Subject</Label>
                  <Input
                    id="csat-subject"
                    placeholder={DEFAULT_CSAT_SUBJECT}
                    value={csatEmailSubject}
                    onChange={(e) => setCsatEmailSubject(e.target.value)}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders:{' '}
                    <code
                      className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => copyToClipboard('{{ticketNumber}}')}
                      title="Click to copy"
                    >
                      {'{{ticketNumber}}'}
                    </code>,{' '}
                    <code
                      className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => copyToClipboard('{{ticketTitle}}')}
                      title="Click to copy"
                    >
                      {'{{ticketTitle}}'}
                    </code>,{' '}
                    <code
                      className="bg-muted px-1 rounded cursor-pointer hover:bg-muted/80"
                      onClick={() => copyToClipboard('{{brandName}}')}
                      title="Click to copy"
                    >
                      {'{{brandName}}'}
                    </code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csat-body">Message Body</Label>
                  <Textarea
                    id="csat-body"
                    placeholder={DEFAULT_CSAT_BODY}
                    value={csatEmailBody}
                    onChange={(e) => setCsatEmailBody(e.target.value)}
                    rows={6}
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    This text appears above the rating button. Leave empty for default message.
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          <Button onClick={handleSaveCsatSettings} disabled={updateBrand.isPending}>
            {updateBrand.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {csatEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Preview</CardTitle>
            <CardDescription>
              This is how the survey email will appear to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-6">
              <div className="space-y-4 max-w-lg mx-auto bg-background rounded-lg p-6 shadow-sm border">
                <h2 className="text-xl font-semibold">
                  {csatEmailSubject || DEFAULT_CSAT_SUBJECT}
                </h2>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {csatEmailBody || DEFAULT_CSAT_BODY}
                </div>
                <div className="pt-4">
                  {csatType === 'thumbs' && (
                    <div className="flex gap-4 justify-center">
                      <Button variant="outline" size="lg" className="gap-2">
                        <ThumbsUp className="h-5 w-5" />
                        Good
                      </Button>
                      <Button variant="outline" size="lg" className="gap-2">
                        <ThumbsUp className="h-5 w-5 rotate-180" />
                        Bad
                      </Button>
                    </div>
                  )}
                  {csatType === 'scale5' && (
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Button key={n} variant="outline" size="sm" className="h-10 w-10 p-0">
                          <Star className="h-5 w-5" />
                        </Button>
                      ))}
                    </div>
                  )}
                  {csatType === 'scale10' && (
                    <div className="flex gap-1 justify-center flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <Button key={n} variant="outline" size="sm" className="h-9 w-9 p-0 text-sm">
                          {n}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-center text-xs text-muted-foreground pt-2">
                  Ticket #{brand?.ticketPrefix || 'ABC'}-123: Example ticket title
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
