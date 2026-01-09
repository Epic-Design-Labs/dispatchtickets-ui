'use client';

import { useQuery } from '@tanstack/react-query';
import { useBrand } from './use-brands';
import { useEmailConnections } from './use-email-connection';
import { useDomains } from './use-domains';
import { useCategories } from './use-categories';
import { useTeamMembers } from './use-team';
import { webhooksApi } from '@/lib/api/webhooks';

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional: boolean;
  href?: string;
  detail?: string;
}

export interface SetupStatus {
  steps: SetupStep[];
  completedCount: number;
  requiredCount: number;
  totalCount: number;
  percentComplete: number;
  isLoading: boolean;
}

export const setupStatusKeys = {
  webhooks: (brandId: string) => ['webhooks', brandId] as const,
};

/**
 * Hook to compute setup completion status for a brand
 * Tracks email setup, categories, team, and webhooks
 */
export function useSetupStatus(brandId: string): SetupStatus {
  const { data: brand, isLoading: brandLoading } = useBrand(brandId);
  const { data: connections, isLoading: connectionsLoading } = useEmailConnections(brandId);
  const { data: domains, isLoading: domainsLoading } = useDomains(brandId);
  const { data: categories, isLoading: categoriesLoading } = useCategories(brandId);
  const { data: members, isLoading: membersLoading } = useTeamMembers();

  // Fetch webhooks (no dedicated hook exists)
  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: setupStatusKeys.webhooks(brandId),
    queryFn: () => webhooksApi.list(brandId),
    enabled: !!brandId,
  });

  const isLoading = brandLoading || connectionsLoading || domainsLoading ||
                    categoriesLoading || membersLoading || webhooksLoading;

  // Compute status for each step
  const activeConnections = connections?.filter(c => c.status === 'ACTIVE') || [];
  const verifiedInboundDomains = domains?.filter(d => d.type === 'INBOUND' && d.verified) || [];
  const verifiedOutboundDomains = domains?.filter(d => d.type === 'OUTBOUND' && d.verified) || [];

  const hasEmailReceiving = activeConnections.length > 0 || verifiedInboundDomains.length > 0;
  const hasEmailSending = activeConnections.length > 0 || verifiedOutboundDomains.length > 0;
  const hasAutoresponse = brand?.autoresponseEnabled === true;
  const hasCategories = (categories?.length || 0) > 0;
  const teamMemberCount = (members?.members?.length || 0) + (members?.invites?.length || 0);
  const hasTeam = teamMemberCount > 1; // More than just the owner
  const hasWebhooks = (webhooks?.length || 0) > 0;

  // Build email receiving detail
  let emailReceivingDetail: string | undefined;
  if (activeConnections.length > 0) {
    const primary = activeConnections.find(c => c.isPrimary) || activeConnections[0];
    emailReceivingDetail = `Gmail: ${primary.email}`;
  } else if (verifiedInboundDomains.length > 0) {
    emailReceivingDetail = `Domain: ${verifiedInboundDomains[0].domain}`;
  }

  // Build email sending detail
  let emailSendingDetail: string | undefined;
  if (activeConnections.length > 0) {
    const primary = activeConnections.find(c => c.isPrimary) || activeConnections[0];
    emailSendingDetail = `Gmail: ${primary.email}`;
  } else if (verifiedOutboundDomains.length > 0) {
    const domain = verifiedOutboundDomains[0];
    emailSendingDetail = domain.fromEmail || `Domain: ${domain.domain}`;
  }

  const steps: SetupStep[] = [
    {
      id: 'brand-created',
      title: 'Brand Created',
      description: brand ? `Your brand "${brand.name}" is ready` : 'Create your brand',
      completed: true, // Always true if they're viewing this page
      optional: false,
    },
    {
      id: 'email-receiving',
      title: 'Email Receiving',
      description: 'Set up how customers can email you',
      completed: hasEmailReceiving,
      optional: false,
      href: `/brands/${brandId}/settings/email`,
      detail: emailReceivingDetail,
    },
    {
      id: 'email-sending',
      title: 'Email Sending',
      description: 'Configure how replies are sent to customers',
      completed: hasEmailSending,
      optional: false,
      href: `/brands/${brandId}/settings/email`,
      detail: emailSendingDetail,
    },
    {
      id: 'autoresponse',
      title: 'Autoresponse',
      description: 'Send automatic replies when tickets are created',
      completed: hasAutoresponse,
      optional: true,
      href: `/brands/${brandId}/settings/email`,
      detail: hasAutoresponse ? 'Enabled' : undefined,
    },
    {
      id: 'categories',
      title: 'Categories',
      description: 'Organize tickets with custom categories',
      completed: hasCategories,
      optional: true,
      href: `/brands/${brandId}/settings/categories`,
      detail: hasCategories ? `${categories?.length} categories` : undefined,
    },
    {
      id: 'team',
      title: 'Invite Team',
      description: 'Add team members to handle tickets',
      completed: hasTeam,
      optional: true,
      href: '/team',
      detail: hasTeam ? `${teamMemberCount} members` : undefined,
    },
    {
      id: 'webhooks',
      title: 'Webhooks',
      description: 'Send ticket events to your app',
      completed: hasWebhooks,
      optional: true,
      href: `/brands/${brandId}/settings/webhooks`,
      detail: hasWebhooks ? `${webhooks?.length} configured` : undefined,
    },
  ];

  const requiredSteps = steps.filter(s => !s.optional);
  const completedSteps = steps.filter(s => s.completed);
  const completedRequired = requiredSteps.filter(s => s.completed);

  return {
    steps,
    completedCount: completedSteps.length,
    requiredCount: requiredSteps.length,
    totalCount: steps.length,
    percentComplete: Math.round((completedRequired.length / requiredSteps.length) * 100),
    isLoading,
  };
}
