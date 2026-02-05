'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const POLL_INTERVAL = 60000; // 1 minute

export interface MentionNotification {
  id: string;
  ticketId: string;
  brandId: string;
  ticketNumber?: number;
  ticketTitle?: string;
  brandName?: string;
  ticketPrefix?: string;
  mentionedBy?: string;
  createdAt: string;
}

// API functions
async function fetchUnreadMentions(): Promise<MentionNotification[]> {
  try {
    const response = await apiClient.get<MentionNotification[]>('/auth/mentions/unread');
    return response.data;
  } catch {
    // Return empty array if endpoint doesn't exist or fails
    return [];
  }
}

async function acknowledgeMention(mentionId: string): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.post<{ success: boolean }>(`/auth/mentions/${mentionId}/ack`);
    return response.data;
  } catch {
    return { success: false };
  }
}

async function acknowledgeMentionsForTicket(ticketId: string): Promise<{ success: boolean }> {
  try {
    const response = await apiClient.post<{ success: boolean }>(`/auth/mentions/ack-ticket/${ticketId}`);
    return response.data;
  } catch {
    return { success: false };
  }
}

export function useMentionNotifications() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const previousMentionIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const [enabled, setEnabled] = useState(true);

  // Poll for unread mentions
  const { data: mentions = [] } = useQuery({
    queryKey: ['mention-notifications'],
    queryFn: fetchUnreadMentions,
    enabled,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    retry: false, // Don't retry failed requests (endpoint might not exist)
  });

  // Acknowledge single mention mutation
  const ackMutation = useMutation({
    mutationFn: acknowledgeMention,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mention-notifications'] });
    },
  });

  // Acknowledge all mentions for a ticket mutation
  const ackTicketMutation = useMutation({
    mutationFn: acknowledgeMentionsForTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mention-notifications'] });
    },
  });

  // Check for new mentions and show toasts
  const checkForNewMentions = useCallback((currentMentions: MentionNotification[]) => {
    // Skip first load - just populate the cache
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      previousMentionIdsRef.current = new Set(currentMentions.map((m) => m.id));
      return;
    }

    const previousIds = previousMentionIdsRef.current;
    const newMentions = currentMentions.filter((m) => !previousIds.has(m.id));

    // Update the ref with current IDs
    previousMentionIdsRef.current = new Set(currentMentions.map((m) => m.id));

    // Show toast for each new mention
    for (const mention of newMentions) {
      const ticketLabel = mention.ticketPrefix && mention.ticketNumber
        ? `${mention.ticketPrefix}-${mention.ticketNumber}`
        : `Ticket`;

      const title = mention.mentionedBy
        ? `${mention.mentionedBy} mentioned you`
        : 'You were mentioned';

      toast.info(title, {
        description: `${ticketLabel}: ${mention.ticketTitle || 'View ticket'}`,
        duration: 10000,
        action: {
          label: 'View',
          onClick: () => {
            router.push(`/brands/${mention.brandId}/tickets/${mention.ticketId}`);
          },
        },
      });
    }
  }, [router]);

  // Process mentions when data changes
  useEffect(() => {
    if (mentions.length > 0 || !isFirstLoadRef.current) {
      checkForNewMentions(mentions);
    }
  }, [mentions, checkForNewMentions]);

  return {
    mentions,
    unreadCount: mentions.length,
    acknowledgeMention: ackMutation.mutate,
    acknowledgeMentionsForTicket: ackTicketMutation.mutate,
    isAcknowledging: ackMutation.isPending || ackTicketMutation.isPending,
    setEnabled,
  };
}

// Hook to auto-acknowledge mentions when viewing a specific ticket
export function useAcknowledgeMentionsOnView(ticketId: string | undefined) {
  const { acknowledgeMentionsForTicket } = useMentionNotifications();

  useEffect(() => {
    if (ticketId) {
      // Small delay to ensure the page has loaded
      const timer = setTimeout(() => {
        acknowledgeMentionsForTicket(ticketId);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [ticketId, acknowledgeMentionsForTicket]);
}
