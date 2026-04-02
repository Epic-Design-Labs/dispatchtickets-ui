'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useBrand, useUpdateBrand } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;

const DEFAULT_SLA_BY_PRIORITY: Record<string, number> = {
  urgent: 4,
  high: 24,
  normal: 72,
  low: 168,
};

function hoursToLabel(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = hours / 24;
  return Number.isInteger(days) ? `${days}d` : `${days.toFixed(1)}d`;
}

export default function SlaSettingsPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data: brand } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);

  const [slaEnabled, setSlaEnabled] = useState(false);
  const [slaDefaultHours, setSlaDefaultHours] = useState<string>('72');
  const [slaByPriority, setSlaByPriority] = useState<Record<string, string>>({
    urgent: '4',
    high: '24',
    normal: '72',
    low: '168',
  });
  const [slaNotifyOverdue, setSlaNotifyOverdue] = useState(true);
  const [slaBusinessHoursOnly, setSlaBusinessHoursOnly] = useState(false);
  const [bhStart, setBhStart] = useState('09:00');
  const [bhEnd, setBhEnd] = useState('17:00');
  const [bhDays, setBhDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bhTimezone, setBhTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isDirty, setIsDirty] = useState(false);

  // Sync from brand data
  useEffect(() => {
    if (brand) {
      setSlaEnabled(brand.slaEnabled ?? false);
      setSlaDefaultHours(String(brand.slaDefaultHours ?? 72));
      setSlaNotifyOverdue(brand.slaNotifyOverdue ?? true);
      if (brand.slaByPriority && Object.keys(brand.slaByPriority).length > 0) {
        const mapped: Record<string, string> = {};
        for (const p of PRIORITIES) {
          mapped[p] = String(brand.slaByPriority[p] ?? DEFAULT_SLA_BY_PRIORITY[p]);
        }
        setSlaByPriority(mapped);
      }
      setSlaBusinessHoursOnly(brand.slaBusinessHoursOnly ?? false);
      if (brand.slaBusinessHours) {
        setBhStart(brand.slaBusinessHours.start || '09:00');
        setBhEnd(brand.slaBusinessHours.end || '17:00');
        setBhDays(brand.slaBusinessHours.days || [1, 2, 3, 4, 5]);
        setBhTimezone(brand.slaBusinessHours.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      setIsDirty(false);
    }
  }, [brand]);

  const handleSave = async () => {
    const byPriority: Record<string, number> = {};
    for (const p of PRIORITIES) {
      const val = parseInt(slaByPriority[p], 10);
      if (!isNaN(val) && val > 0) byPriority[p] = val;
    }

    const defaultHours = parseInt(slaDefaultHours, 10);

    try {
      await updateBrand.mutateAsync({
        slaEnabled,
        slaDefaultHours: !isNaN(defaultHours) && defaultHours > 0 ? defaultHours : undefined,
        slaByPriority: byPriority,
        slaNotifyOverdue,
        slaBusinessHoursOnly,
        slaBusinessHours: { start: bhStart, end: bhEnd, days: bhDays, timezone: bhTimezone },
      });
      toast.success('SLA settings saved');
      setIsDirty(false);
    } catch {
      toast.error('Failed to save SLA settings');
    }
  };

  const markDirty = () => setIsDirty(true);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Level Agreement (SLA)</CardTitle>
          <CardDescription>
            Set default due dates for new tickets. When enabled, tickets automatically get a
            due date based on their priority.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable SLA</Label>
              <p className="text-sm text-muted-foreground">
                Automatically set due dates on new tickets
              </p>
            </div>
            <Switch
              checked={slaEnabled}
              onCheckedChange={(v) => { setSlaEnabled(v); markDirty(); }}
            />
          </div>

          {slaEnabled && (
            <>
              <div className="space-y-2">
                <Label>Default SLA (hours)</Label>
                <p className="text-sm text-muted-foreground">
                  Fallback if no per-priority SLA is configured. {slaDefaultHours && !isNaN(Number(slaDefaultHours)) && Number(slaDefaultHours) > 0 ? `(${hoursToLabel(Number(slaDefaultHours))})` : ''}
                </p>
                <Input
                  type="number"
                  min={1}
                  value={slaDefaultHours}
                  onChange={(e) => { setSlaDefaultHours(e.target.value); markDirty(); }}
                  className="w-32"
                />
              </div>

              <div className="space-y-3">
                <Label>SLA by Priority</Label>
                <p className="text-sm text-muted-foreground">
                  Set different response times for each priority level (in hours).
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  {PRIORITIES.map((p) => (
                    <div key={p} className="flex items-center gap-3">
                      <Label className="w-16 capitalize text-sm">{p}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={slaByPriority[p] || ''}
                        onChange={(e) => {
                          setSlaByPriority((prev) => ({ ...prev, [p]: e.target.value }));
                          markDirty();
                        }}
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground">
                        {slaByPriority[p] && !isNaN(Number(slaByPriority[p])) ? hoursToLabel(Number(slaByPriority[p])) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Overdue Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Email watchers and assignees when a ticket passes its due date
                  </p>
                </div>
                <Switch
                  checked={slaNotifyOverdue}
                  onCheckedChange={(v) => { setSlaNotifyOverdue(v); markDirty(); }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Business Hours Only</Label>
                  <p className="text-sm text-muted-foreground">
                    Only count business hours toward SLA deadlines (e.g. 24h SLA = 3 business days)
                  </p>
                </div>
                <Switch
                  checked={slaBusinessHoursOnly}
                  onCheckedChange={(v) => { setSlaBusinessHoursOnly(v); markDirty(); }}
                />
              </div>

              {slaBusinessHoursOnly && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="text-sm font-medium">Business Hours</h4>
                  <div className="grid grid-cols-3 gap-4 max-w-md">
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="time"
                        value={bhStart}
                        onChange={(e) => { setBhStart(e.target.value); markDirty(); }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <Input
                        type="time"
                        value={bhEnd}
                        onChange={(e) => { setBhEnd(e.target.value); markDirty(); }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Timezone</Label>
                      <Input
                        value={bhTimezone}
                        onChange={(e) => { setBhTimezone(e.target.value); markDirty(); }}
                        placeholder="America/New_York"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block">Working Days</Label>
                    <div className="flex gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <button
                          key={day}
                          type="button"
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            bhDays.includes(i)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                          onClick={() => {
                            setBhDays((prev) =>
                              prev.includes(i)
                                ? prev.filter((d) => d !== i)
                                : [...prev, i].sort()
                            );
                            markDirty();
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={!isDirty || updateBrand.isPending}
            >
              {updateBrand.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
