'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { useSubscription, usePlans, useCancelSubscription, useReactivateSubscription, useUpgradeSubscription, useUsage, useInvoices, useDeleteAccount } from '@/lib/hooks';
import { useAuth } from '@/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plan, Invoice } from '@/lib/api/billing';
import { Input } from '@/components/ui/input';
import { FileText, Download, ExternalLink, AlertTriangle } from 'lucide-react';

// Plan group types
interface PlanGroup {
  baseName: string;
  monthly: Plan | null;
  annual: Plan | null;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const isOwner = session?.orgRole === 'owner';
  const { data: subscriptionData, isLoading: subscriptionLoading, error: subscriptionError, refetch } = useSubscription();
  const { data: plansData, isLoading: plansLoading } = usePlans();
  const { data: usageData, isLoading: usageLoading } = useUsage();
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices(10);

  // Handle upgrade success URL param
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      // Force refetch subscription data
      refetch().then(() => {
        toast.success('Subscription updated successfully');
      });
      // Clean up URL
      router.replace('/billing', { scroll: false });
    }
  }, [searchParams, refetch, router]);

  const cancelSubscription = useCancelSubscription();
  const reactivateSubscription = useReactivateSubscription();
  const upgradeSubscription = useUpgradeSubscription();
  const deleteAccount = useDeleteAccount();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [selectedDowngradePlan, setSelectedDowngradePlan] = useState<Plan | null>(null);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const subscription = subscriptionData?.subscription;
  const allPlans = plansData?.plans || [];
  const invoices = invoicesData?.invoices || [];

  // Detect current billing period from subscription
  useEffect(() => {
    if (subscription?.planInterval === 'year') {
      setBillingPeriod('annual');
    }
  }, [subscription]);

  // Group plans by base name (Starter, Pro, Enterprise) - excludes Free plan
  const planGroups = useMemo(() => {
    const groups: Record<string, PlanGroup> = {};

    allPlans.forEach((plan) => {
      // Skip free plan from the upgrade grid - it shows in Current Plan section
      if (plan.price === 0) return;

      // Extract base name (remove "Monthly" or "Annual" suffix)
      const baseName = plan.name.replace(/ (Monthly|Annual)$/i, '');

      if (!groups[baseName]) {
        groups[baseName] = { baseName, monthly: null, annual: null };
      }

      if (plan.interval === 'month') {
        groups[baseName].monthly = plan;
      } else if (plan.interval === 'year') {
        groups[baseName].annual = plan;
      }
    });

    // Sort by price (using monthly price as reference)
    return Object.values(groups).sort((a, b) => {
      const priceA = a.monthly?.price || 0;
      const priceB = b.monthly?.price || 0;
      return priceA - priceB;
    });
  }, [allPlans]);

  const freePlan = allPlans.find(p => p.price === 0);
  const currentPlan = subscription ? allPlans.find(p => p.id === subscription.planId) : null;

  const handleCancel = async () => {
    try {
      const result = await cancelSubscription.mutateAsync({});
      toast.success(result.message);
      setCancelDialogOpen(false);
    } catch {
      toast.error('Failed to cancel subscription');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    try {
      const result = await deleteAccount.mutateAsync({ confirmation: 'DELETE' });
      toast.success(result.message);
      setDeleteDialogOpen(false);
      // Redirect to login page after account deletion
      window.location.href = '/login';
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const handleReactivate = async () => {
    try {
      const result = await reactivateSubscription.mutateAsync();
      toast.success(result.message);
    } catch {
      toast.error('Failed to reactivate subscription');
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      const result = await upgradeSubscription.mutateAsync({
        planId,
        successUrl: `${window.location.origin}/billing?upgraded=true`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      // Redirect to Stripe checkout
      window.location.href = result.url;
    } catch (error: unknown) {
      console.error('Upgrade error:', error);
      // Extract message from axios error response
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message
        || (error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Upgrade failed: ${message}`);
      setUpgradingPlanId(null);
    }
  };

  const formatPrice = (price: number | null | undefined, currency: string, interval: string) => {
    if (!price && price !== 0) return 'Not available';

    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
      minimumFractionDigits: 0,
    }).format(price / 100);

    if (interval === 'year') {
      const monthly = Math.round(price / 12);
      const monthlyFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency?.toUpperCase() || 'USD',
        minimumFractionDigits: 0,
      }).format(monthly / 100);
      return `${monthlyFormatted}/mo`;
    }

    return `${formatted}/${interval || 'month'}`;
  };

  const formatAnnualTotal = (price: number, currency: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
      minimumFractionDigits: 0,
    }).format(price / 100);
    return `${formatted}/year`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    // Check for invalid date or Unix epoch (indicates null/undefined from API)
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
      return 'Not available';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatInvoiceAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'USD',
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Cancelling</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'open':
        return <Badge className="bg-yellow-500">Open</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'void':
        return <Badge variant="secondary">Void</Badge>;
      case 'uncollectible':
        return <Badge variant="destructive">Uncollectible</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Plan feature mapping based on plan name
  const planDetails: Record<string, { tickets: string; support: string; sla?: string }> = {
    'Free': { tickets: '100 tickets/mo', support: 'Community support' },
    'Starter': { tickets: '1,000 tickets/mo', support: 'Email support' },
    'Pro': { tickets: '10,000 tickets/mo', support: 'Priority support' },
    'Enterprise': { tickets: '100,000 tickets/mo', support: 'Dedicated support', sla: '99.9% SLA' },
  };

  const getPlanFeatures = (plan: Plan, baseName: string) => {
    const features: string[] = [];
    const entitlements = plan.entitlements as Record<string, number | boolean>;
    const details = planDetails[baseName] || planDetails['Starter'];

    // Tickets per month
    features.push(details.tickets);

    // Brands limit
    if (entitlements.brands_limit === -1) {
      features.push('Unlimited brands');
    } else if (typeof entitlements.brands_limit === 'number') {
      features.push(`${entitlements.brands_limit} brand${entitlements.brands_limit === 1 ? '' : 's'}`);
    }

    // Custom domain
    if (entitlements.custom_domain) {
      features.push('Custom email domains');
    }

    // Support level
    features.push(details.support);

    // SLA (Enterprise only)
    if (details.sla) {
      features.push(details.sla);
    }

    return features;
  };

  const isCurrentPlan = (plan: Plan) => {
    return subscription?.planId === plan.id;
  };

  const isUpgrade = (plan: Plan) => {
    if (!subscription) return true;
    return plan.price > subscription.planPrice;
  };

  // Check if downgrade is allowed based on current usage vs target plan limits
  const getDowngradeBlockReason = (plan: Plan): string | null => {
    if (!usageData) return null;

    const entitlements = plan.entitlements as Record<string, number | boolean>;
    const targetBrandLimit = entitlements.brands_limit;

    // Check brand limit (-1 means unlimited)
    if (typeof targetBrandLimit === 'number' && targetBrandLimit !== -1) {
      if (usageData.brandCount > targetBrandLimit) {
        return `You have ${usageData.brandCount} brands but this plan only allows ${targetBrandLimit}. Please delete ${usageData.brandCount - targetBrandLimit} brand${usageData.brandCount - targetBrandLimit > 1 ? 's' : ''} first.`;
      }
    }

    return null;
  };

  const handleDowngrade = (plan: Plan) => {
    const blockReason = getDowngradeBlockReason(plan);
    if (blockReason) {
      toast.error(blockReason);
      return;
    }
    setSelectedDowngradePlan(plan);
    setDowngradeDialogOpen(true);
  };

  const confirmDowngrade = async () => {
    if (!selectedDowngradePlan) return;
    try {
      const result = await upgradeSubscription.mutateAsync({
        planId: selectedDowngradePlan.id,
        successUrl: `${window.location.origin}/billing?upgraded=true`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      // For free plan, no checkout redirect - just refresh
      if (selectedDowngradePlan.price === 0) {
        toast.success('Downgraded to free plan');
        refetch();
        setDowngradeDialogOpen(false);
        setSelectedDowngradePlan(null);
      } else {
        window.location.href = result.url;
      }
    } catch {
      toast.error('Failed to change plan');
    }
  };

  // Calculate savings for annual plans
  const getAnnualSavings = (group: PlanGroup): number | null => {
    if (!group.monthly || !group.annual) return null;
    const monthlyYearlyTotal = group.monthly.price * 12;
    const annualPrice = group.annual.price;
    const savings = Math.round(((monthlyYearlyTotal - annualPrice) / monthlyYearlyTotal) * 100);
    return savings > 0 ? savings : null;
  };

  return (
    <div className="flex flex-col">
      <Header title="Billing" />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2>
          <p className="text-muted-foreground">
            Manage your subscription and billing details
          </p>
        </div>

        {subscriptionLoading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        )}

        {subscriptionError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Failed to load subscription info. Please try again.
              </p>
            </CardContent>
          </Card>
        )}

        {!subscriptionLoading && !subscriptionError && (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>Current Plan</CardTitle>
                    {subscription && getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="space-y-6">
                    <div className="flex items-baseline gap-4">
                      <h3 className="text-3xl font-bold">{subscription.planName}</h3>
                      <span className="text-xl text-muted-foreground">
                        {formatPrice(subscription.planPrice, subscription.planCurrency, subscription.planInterval)}
                        {subscription.planInterval === 'year' && (
                          <span className="text-sm ml-1">
                            ({formatAnnualTotal(subscription.planPrice, subscription.planCurrency)})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Plan Entitlements */}
                    {currentPlan && (
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm py-3 border-y">
                        {getPlanFeatures(currentPlan, subscription.planName.replace(/ (Monthly|Annual)$/, '')).map((feature, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-6 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Billing Cycle</p>
                        <p className="font-medium capitalize">{subscription.planInterval === 'year' ? 'Annual' : 'Monthly'}</p>
                      </div>
                      {subscription.currentPeriodEnd && (
                        <div>
                          <p className="text-muted-foreground mb-1">
                            {subscription.cancelAtPeriodEnd ? 'Ends On' : 'Next Renewal'}
                          </p>
                          <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {subscription.cancelAtPeriodEnd && (
                        <Button
                          onClick={handleReactivate}
                          disabled={reactivateSubscription.isPending}
                        >
                          {reactivateSubscription.isPending ? 'Reactivating...' : 'Reactivate Subscription'}
                        </Button>
                      )}
                      {!subscription.cancelAtPeriodEnd && freePlan && !isCurrentPlan(freePlan) && (
                        <button
                          onClick={() => handleDowngrade(freePlan)}
                          disabled={upgradeSubscription.isPending || !!getDowngradeBlockReason(freePlan)}
                          title={getDowngradeBlockReason(freePlan) || undefined}
                          className="text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Downgrade to Free
                        </button>
                      )}
                      {!subscription.cancelAtPeriodEnd && (
                        <button
                          onClick={() => setCancelDialogOpen(true)}
                          className="text-sm text-muted-foreground hover:text-destructive hover:underline"
                        >
                          Cancel Subscription
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-lg font-medium">No active subscription</p>
                    <p className="text-muted-foreground mt-1">
                      Choose a plan below to get started.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available Plans */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Plans</CardTitle>
                    <CardDescription>
                      {subscription ? 'Upgrade or change your plan' : 'Choose a plan to get started'}
                    </CardDescription>
                  </div>
                  {/* Billing Period Toggle */}
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium transition-colors ${billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Monthly
                    </span>
                    <button
                      onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                      className="relative h-6 w-11 rounded-full bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      role="switch"
                      aria-checked={billingPeriod === 'annual'}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-primary shadow-sm transition-transform duration-200 ${
                          billingPeriod === 'annual' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-medium transition-colors ${billingPeriod === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Annual
                      </span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        Save up to 34%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-64 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3 items-stretch">
                    {planGroups.map((group) => {
                      const plan = billingPeriod === 'annual' ? group.annual : group.monthly;
                      if (!plan) return null;

                      const savings = getAnnualSavings(group);
                      const isCurrent = isCurrentPlan(plan);
                      const isUpgradeAction = isUpgrade(plan);

                      return (
                        <div
                          key={group.baseName}
                          className={`relative rounded-lg border p-4 flex flex-col ${
                            isCurrent ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          {isCurrent && (
                            <Badge className="absolute -top-2 right-2 bg-primary">
                              Current
                            </Badge>
                          )}
                          {billingPeriod === 'annual' && savings && !isCurrent && (
                            <Badge className="absolute -top-2 left-2 bg-green-600">
                              Save {savings}%
                            </Badge>
                          )}
                          <div className="mb-4">
                            <h3 className="font-semibold">{group.baseName}</h3>
                            <p className="text-2xl font-bold mt-1">
                              {formatPrice(plan.price, plan.currency, plan.interval)}
                            </p>
                            {billingPeriod === 'annual' && (
                              <p className="text-sm text-muted-foreground">
                                {formatAnnualTotal(plan.price, plan.currency)}
                              </p>
                            )}
                          </div>
                          <ul className="space-y-2 text-sm text-muted-foreground mb-4 flex-1">
                            {getPlanFeatures(plan, group.baseName).map((feature, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {feature}
                              </li>
                            ))}
                            {/* Overage pricing */}
                            <li className="flex items-center gap-2 pt-2 border-t">
                              <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              <span>$0.02/ticket overage</span>
                            </li>
                          </ul>
                          {!isCurrent && (
                            <Button
                              className="w-full"
                              variant={isUpgradeAction ? 'default' : 'outline'}
                              onClick={() => {
                                if (isUpgradeAction) {
                                  handleUpgrade(plan.id);
                                } else {
                                  handleDowngrade(plan);
                                }
                              }}
                              disabled={upgradingPlanId !== null || (!isUpgradeAction && (subscription?.cancelAtPeriodEnd || !!getDowngradeBlockReason(plan)))}
                              title={!isUpgradeAction ? getDowngradeBlockReason(plan) || undefined : undefined}
                            >
                              {upgradingPlanId === plan.id
                                ? 'Processing...'
                                : isUpgradeAction
                                ? 'Upgrade'
                                : 'Downgrade'}
                            </Button>
                          )}
                          {isCurrent && (
                            <Button className="w-full" variant="outline" disabled>
                              Current Plan
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Usage</CardTitle>
                <CardDescription>
                  Your usage for the current billing period
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ) : usageData ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">
                        {usageData.ticketCount.toLocaleString()}
                        {usageData.planLimit && (
                          <span className="text-lg font-normal text-muted-foreground">
                            {' '}/ {usageData.planLimit.toLocaleString()}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        tickets this billing period
                      </p>
                    </div>
                    {usageData.planLimit && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            usageData.ticketCount >= usageData.planLimit
                              ? 'bg-destructive'
                              : usageData.ticketCount >= usageData.planLimit * 0.8
                              ? 'bg-yellow-500'
                              : 'bg-primary'
                          }`}
                          style={{
                            width: `${Math.min(100, (usageData.ticketCount / usageData.planLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                    {usageData.ticketCount > (usageData.planLimit || 0) && usageData.planLimit && (
                      <p className="text-sm text-amber-600">
                        You&apos;re {usageData.ticketCount - usageData.planLimit} tickets over your limit.
                        Overage charges: ${((usageData.ticketCount - usageData.planLimit) * 0.02).toFixed(2)}
                      </p>
                    )}
                    {subscription?.currentPeriodEnd && (
                      <p className="text-xs text-muted-foreground">
                        Period resets: {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No usage data available.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Invoice History */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>
                  Your past payments and invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      No invoices yet. Your payment history will appear here.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice: Invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.number || invoice.id.slice(-8)}
                          </TableCell>
                          <TableCell>{formatShortDate(invoice.created)}</TableCell>
                          <TableCell>
                            {formatShortDate(invoice.periodStart)} - {formatShortDate(invoice.periodEnd)}
                          </TableCell>
                          <TableCell>
                            {formatInvoiceAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                          </TableCell>
                          <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {invoice.invoiceUrl && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(invoice.invoiceUrl!, '_blank')}
                                  title="View invoice"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                              {invoice.invoicePdf && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(invoice.invoicePdf!, '_blank')}
                                  title="Download PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </div>
                <CardDescription>
                  Irreversible actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <div>
                    <h4 className="font-medium">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data including brands, tickets, and settings.
                    </p>
                    {!isOwner && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Only account owners can delete the account.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={!isOwner}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You&apos;ll continue to have
              access until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSubscription.isPending ? 'Cancelling...' : 'Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Downgrade Plan Dialog */}
      <AlertDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade to {selectedDowngradePlan?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to downgrade to the {selectedDowngradePlan?.name} plan?
              {selectedDowngradePlan?.price === 0
                ? ' Your current plan benefits will end immediately.'
                : ' The change will take effect at your next billing cycle.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedDowngradePlan(null)}>
              Keep Current Plan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDowngrade}
            >
              {upgradeSubscription.isPending ? 'Processing...' : 'Confirm Downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) setDeleteConfirmation('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action <strong>cannot be undone</strong>. This will permanently delete your account
                and remove all associated data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All brands and their settings</li>
                <li>All tickets and comments</li>
                <li>All attachments and files</li>
                <li>All team members and permissions</li>
                <li>Your subscription will be cancelled</li>
              </ul>
              <p className="pt-2">
                Please type <strong>DELETE</strong> to confirm:
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder="Type DELETE to confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || deleteAccount.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
