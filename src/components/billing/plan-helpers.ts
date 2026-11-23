import type { Plan } from '@/lib/api/billing';

export interface PlanGroup {
  baseName: string;
  monthly: Plan | null;
  annual: Plan | null;
}

/** "Pro Annual" / "Pro (Monthly)" -> "Pro". */
export function planBaseName(name: string): string {
  return name.replace(/\s*\(?(?:Monthly|Annual)\)?$/i, '');
}

const TIER_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };

function tierRank(plan: { name: string; price: number }): number {
  const rank = TIER_RANK[planBaseName(plan.name).toLowerCase()];
  return rank ?? (plan.price === 0 ? 0 : 1);
}

/**
 * Mirrors the API's isUpgradeChange (api/src/modules/billing/plan-catalog.ts):
 * tier first, then amount within a tier. Comparing raw prices instead called
 * Starter Annual ($228) -> Pro Monthly ($99) a downgrade, so the confirm dialog
 * promised "no charge now" for a change the server charges immediately.
 */
export function isUpgradeChange(
  current: { name: string; price: number } | null | undefined,
  target: Plan,
): boolean {
  if (!current) return true;
  const cur = tierRank(current);
  const tgt = tierRank(target);
  if (tgt !== cur) return tgt > cur;
  return target.price > current.price;
}

export function groupPlans(plans: Plan[]): PlanGroup[] {
  const groups: Record<string, PlanGroup> = {};
  for (const plan of plans) {
    if (plan.price === 0) continue; // Free is reached by cancelling, not switching
    const baseName = planBaseName(plan.name);
    groups[baseName] ??= { baseName, monthly: null, annual: null };
    if (plan.interval === 'month') groups[baseName].monthly = plan;
    else if (plan.interval === 'year') groups[baseName].annual = plan;
  }
  return Object.values(groups).sort(
    (a, b) => (a.monthly?.price ?? a.annual?.price ?? 0) - (b.monthly?.price ?? b.annual?.price ?? 0),
  );
}

export function annualSavings(group: PlanGroup): number | null {
  if (!group.monthly || !group.annual) return null;
  const yearly = group.monthly.price * 12;
  const pct = Math.round(((yearly - group.annual.price) / yearly) * 100);
  return pct > 0 ? pct : null;
}

export function money(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** "$29 per month", or "$228 per year ($19/mo)". */
export function priceLine(price: number, currency: string, interval: string): string {
  if (interval === 'year') {
    return `${money(price, currency)} per year (${money(Math.round(price / 12), currency)}/mo)`;
  }
  return `${money(price, currency)} per month`;
}

/** Short price for a plan row: "$29/mo", or "$19/mo" for an annual plan. */
export function monthlyEquivalent(plan: Plan): string {
  const cents = plan.interval === 'year' ? Math.round(plan.price / 12) : plan.price;
  return `${money(cents, plan.currency)}/mo`;
}

const SUPPORT: Record<string, string> = {
  Free: 'Email support',
  Starter: 'Email support',
  Pro: 'Priority support',
  Enterprise: 'Dedicated support',
};

const TICKETS_FALLBACK: Record<string, number> = {
  Free: 100,
  Starter: 1000,
  Pro: 10000,
  Enterprise: 100000,
};

export function planFeatures(plan: Plan): string[] {
  const base = planBaseName(plan.name);
  const ent = plan.entitlements as Record<string, number | boolean | undefined>;
  const out: string[] = [];
  // Stackbe plans may not carry tickets_per_month; fall back to the price list.
  const tickets = ent.tickets_per_month ?? TICKETS_FALLBACK[base];
  if (typeof tickets === 'number') {
    out.push(tickets === -1 ? 'Unlimited tickets' : `${tickets.toLocaleString()} tickets a month`);
  }
  const brands = ent.brands_limit;
  if (brands === -1) out.push('Unlimited brands');
  else if (typeof brands === 'number') out.push(`${brands} brand${brands === 1 ? '' : 's'}`);
  if (ent.custom_domain) out.push('Custom email domains');
  if (SUPPORT[base]) out.push(SUPPORT[base]);
  if (base === 'Enterprise') out.push('99.9% SLA');
  return out;
}

export function formatLongDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
