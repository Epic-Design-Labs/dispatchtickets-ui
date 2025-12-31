'use client';

import { Badge } from '@/components/ui/badge';
import { OrgRole } from '@/types';

interface RoleBadgeProps {
  role: OrgRole;
}

const roleConfig: Record<OrgRole, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  owner: { label: 'Owner', variant: 'default' },
  admin: { label: 'Admin', variant: 'secondary' },
  member: { label: 'Member', variant: 'outline' },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig.member;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
