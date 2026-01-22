import { useState, useEffect, useCallback } from 'react';
import { getSessionToken } from '@/providers/auth-provider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';

// ============================================================================
// Types
// ============================================================================

export interface PortalToken {
  token: string;
  expiresAt: string;
  customerId: string;
  email: string;
  name?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: number;
  title: string;
  body?: string;
  status: string;
  priority: string;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
  brand?: {
    name: string;
    ticketPrefix: string;
  };
  comments?: SupportComment[];
}

export interface SupportComment {
  id: string;
  body: string;
  authorType: 'AGENT' | 'CUSTOMER' | 'SYSTEM';
  authorName?: string;
  authorId?: string;
  createdAt: string;
}

export interface SupportAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  status: 'PENDING' | 'UPLOADED';
}

export interface PendingUploadResponse {
  attachment: SupportAttachment;
  uploadUrl: string;
  expiresAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useSupportPortal() {
  const [portalToken, setPortalToken] = useState<PortalToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch portal token from our backend API route
  const fetchToken = useCallback(async () => {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/support/token', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get support token');
      }

      const data = await response.json();
      setPortalToken(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Check if token is expired or about to expire (within 5 minutes)
  const isTokenExpiring = useCallback(() => {
    if (!portalToken) return true;
    const expiresAt = new Date(portalToken.expiresAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return expiresAt - now < fiveMinutes;
  }, [portalToken]);

  // Helper for making authenticated portal API calls
  const portalFetch = useCallback(async <T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    if (!portalToken) {
      throw new Error('No portal token');
    }

    // Refresh token if expiring
    if (isTokenExpiring()) {
      await fetchToken();
    }

    const currentToken = portalToken?.token;
    if (!currentToken) {
      throw new Error('No portal token after refresh');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }, [portalToken, isTokenExpiring, fetchToken]);

  // ============================================================================
  // API Methods
  // ============================================================================

  const listTickets = useCallback(async (params?: {
    status?: string;
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedResponse<SupportTicket>> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return portalFetch(`/portal/tickets${query ? `?${query}` : ''}`);
  }, [portalFetch]);

  const getTicket = useCallback(async (ticketId: string): Promise<SupportTicket> => {
    return portalFetch(`/portal/tickets/${ticketId}`);
  }, [portalFetch]);

  const createTicket = useCallback(async (
    data: { title: string; body?: string; attachmentIds?: string[] },
    idempotencyKey?: string
  ): Promise<SupportTicket> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    return portalFetch('/portal/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  }, [portalFetch]);

  // ============================================================================
  // Attachment Methods
  // ============================================================================

  const initiatePendingUpload = useCallback(async (
    file: { filename: string; contentType: string; size: number }
  ): Promise<PendingUploadResponse> => {
    return portalFetch('/portal/tickets/attachments/pending', {
      method: 'POST',
      body: JSON.stringify(file),
    });
  }, [portalFetch]);

  const confirmPendingUpload = useCallback(async (
    attachmentId: string
  ): Promise<SupportAttachment> => {
    return portalFetch(`/portal/tickets/attachments/pending/${attachmentId}/confirm`, {
      method: 'POST',
    });
  }, [portalFetch]);

  const uploadFile = useCallback(async (file: File): Promise<SupportAttachment> => {
    // 1. Initiate upload to get presigned URL
    const response = await initiatePendingUpload({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    });

    // 2. Upload directly to S3/R2
    const uploadResponse = await fetch(response.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    // 3. Confirm the upload
    return confirmPendingUpload(response.attachment.id);
  }, [initiatePendingUpload, confirmPendingUpload]);

  const addComment = useCallback(async (
    ticketId: string,
    body: string,
    idempotencyKey?: string
  ): Promise<SupportComment> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    return portalFetch(`/portal/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
      headers,
    });
  }, [portalFetch]);

  return {
    // State
    portalToken,
    loading,
    error,
    isAuthenticated: !!portalToken && !isTokenExpiring(),

    // Actions
    refreshToken: fetchToken,

    // API methods
    listTickets,
    getTicket,
    createTicket,
    addComment,

    // Attachment methods
    uploadFile,
  };
}
