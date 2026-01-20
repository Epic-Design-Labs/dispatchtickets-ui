import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TicketStatusObject } from '@/types/status';

type StatusKey = 'open' | 'pending' | 'resolved' | 'closed' | 'spam' | string;

// Default colors for system statuses (fallback when no statusRef)
const statusDefaults: Record<string, { label: string; color: string; className: string }> = {
  open: {
    label: 'Open',
    color: '#3b82f6',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  pending: {
    label: 'Pending',
    color: '#f59e0b',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  },
  resolved: {
    label: 'Resolved',
    color: '#22c55e',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  closed: {
    label: 'Closed',
    color: '#22c55e',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  spam: {
    label: 'Spam',
    color: '#ef4444',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
};

interface StatusBadgeProps {
  /** Status key (e.g., 'open', 'pending') - for backwards compatibility */
  status: StatusKey;
  /** Full status object with custom color - takes precedence if provided */
  statusRef?: TicketStatusObject | null;
  className?: string;
}

/**
 * Helper to get contrasting text color for a background
 */
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

/**
 * Helper to lighten a color for background
 */
function lightenColor(hexColor: string, amount: number = 0.85): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

export function StatusBadge({ status, statusRef, className }: StatusBadgeProps) {
  // Always use the status key as the source of truth
  // Only use statusRef for color/name if it matches the current status key
  // This prevents stale statusRef from showing wrong status after updates
  const defaults = statusDefaults[status];

  // Check if statusRef matches the status key (not stale)
  const statusRefMatchesKey = statusRef?.key === status;

  // If we have a matching statusRef with a custom color, use it
  if (statusRefMatchesKey && statusRef?.color) {
    const bgColor = lightenColor(statusRef.color, 0.85);
    const textColor = statusRef.color;

    return (
      <Badge
        variant="secondary"
        className={cn('hover:opacity-90', className)}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderColor: 'transparent',
        }}
      >
        {statusRef.name}
      </Badge>
    );
  }

  // Use default styling based on status key
  if (defaults) {
    return (
      <Badge
        variant="secondary"
        className={cn(defaults.className, className)}
      >
        {defaults.label}
      </Badge>
    );
  }

  // Unknown/custom status without matching statusRef - show the key with default styling
  // Or use statusRef if available (even if key doesn't match, for custom statuses)
  if (statusRef?.color) {
    const bgColor = lightenColor(statusRef.color, 0.85);
    const textColor = statusRef.color;

    return (
      <Badge
        variant="secondary"
        className={cn('hover:opacity-90', className)}
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderColor: 'transparent',
        }}
      >
        {statusRef.name || status}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn('bg-gray-100 text-gray-600 hover:bg-gray-100', className)}
    >
      {status}
    </Badge>
  );
}
