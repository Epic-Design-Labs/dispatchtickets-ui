'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Plan, Subscription } from '@/lib/api/billing';
import {
  annualSavings,
  groupPlans,
  isUpgradeChange,
  money,
  monthlyEquivalent,
  planFeatures,
} from './plan-helpers';

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  plansLoading: boolean;
  subscription: Subscription | null | undefined;
  /** Why a downgrade to this plan is not allowed (too many brands), or null. */
  blockReason: (plan: Plan) => string | null;
  /** Hands the chosen plan to the page, which shows the confirm step. */
  onChoose: (plan: Plan, kind: 'upgrade' | 'downgrade') => void;
}

export function ChangePlanDialog({
  open,
  onOpenChange,
  plans,
  plansLoading,
  subscription,
  blockReason,
  onChoose,
}: ChangePlanDialogProps) {
  const groups = useMemo(() => groupPlans(plans), [plans]);
  // Opens on the period the customer is already billed on. The page remounts
  // this dialog (new key) each time it opens, so nothing carries over.
  const [period, setPeriod] = useState<'monthly' | 'annual'>(
    subscription?.planInterval === 'month' ? 'monthly' : 'annual',
  );
  const [selected, setSelected] = useState<string>('');

  const current = subscription
    ? { name: subscription.planName, price: subscription.planPrice }
    : null;
  const visible = groups
    .map((g) => ({ group: g, plan: period === 'annual' ? g.annual : g.monthly }))
    .filter((x): x is { group: typeof x.group; plan: Plan } => !!x.plan);
  const chosen = visible.find((x) => x.plan.id === selected)?.plan ?? null;
  const chosenUpgrade = chosen ? isUpgradeChange(current, chosen) : true;
  const bestSavings = Math.max(0, ...groups.map((g) => annualSavings(g) ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{subscription ? 'Change plan' : 'Choose a plan'}</DialogTitle>
          <DialogDescription>
            Upgrades start right away and are charged today. Downgrades take effect when your
            current period ends.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted inline-flex w-fit rounded-lg p-1 text-sm" role="tablist">
          {(['monthly', 'annual'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              onClick={() => {
                setPeriod(p);
                setSelected('');
              }}
              className={cn(
                'rounded-md px-3 py-1 font-medium transition-colors',
                period === p ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p === 'monthly' ? 'Monthly' : 'Annual'}
              {p === 'annual' && bestSavings > 0 && (
                <span className="text-success-foreground ml-1.5 text-xs">Save up to {bestSavings}%</span>
              )}
            </button>
          ))}
        </div>

        {plansLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <RadioGroup value={selected} onValueChange={setSelected} className="gap-2">
            {visible.map(({ group, plan }) => {
              const isCurrent = subscription?.planId === plan.id;
              const upgrade = isUpgradeChange(current, plan);
              const blocked = !isCurrent && !upgrade ? blockReason(plan) : null;
              const disabled = isCurrent || !!blocked;
              const savings = period === 'annual' ? annualSavings(group) : null;
              return (
                <label
                  key={plan.id}
                  htmlFor={`plan-${plan.id}`}
                  className={cn(
                    'flex gap-3 rounded-lg border p-3 transition-colors',
                    disabled ? 'cursor-default opacity-70' : 'hover:bg-accent/50 cursor-pointer',
                    selected === plan.id && 'border-primary bg-primary/5',
                  )}
                >
                  <RadioGroupItem
                    value={plan.id}
                    id={`plan-${plan.id}`}
                    disabled={disabled}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="flex items-center gap-2 font-medium">
                        {group.baseName}
                        {isCurrent && (
                          <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                            Current plan
                          </span>
                        )}
                      </span>
                      <span className="text-sm">
                        <span className="font-semibold">{monthlyEquivalent(plan)}</span>
                        {plan.interval === 'year' && (
                          <span className="text-muted-foreground"> · {money(plan.price, plan.currency)} a year</span>
                        )}
                      </span>
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {planFeatures(plan).join(' · ')}
                      {savings ? ` · save ${savings}%` : ''}
                    </span>
                    {blocked && <span className="text-destructive mt-1 block text-xs">{blocked}</span>}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
        )}

        <p className="text-muted-foreground text-xs">
          Paid plans can go over their ticket limit: extra tickets cost $20 per 1,000. To go back to
          Free, cancel your subscription.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!chosen}
            onClick={() => chosen && onChoose(chosen, chosenUpgrade ? 'upgrade' : 'downgrade')}
          >
            {!chosen ? 'Pick a plan' : chosenUpgrade ? `Upgrade to ${chosen.name}` : `Switch to ${chosen.name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
