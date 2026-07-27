'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { getAuthToken } from '@/lib/api/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';

interface Session {
  customerId: string;
  memberId?: string; // Stackbe member ID (for ticket assignment matching)
  email: string;
  organizationId: string;
  orgRole?: string;
  connected: boolean;
  expiresAt?: string;
}

interface CheckEmailResult {
  exists: boolean;
}

interface SendMagicLinkResult {
  success: boolean;
  notFound?: boolean;
}

interface AcceptInviteResult {
  success: boolean;
  message?: string;
  organizationId?: string;
}

interface AuthContextType {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConnected: boolean;
  checkEmail: (email: string) => Promise<CheckEmailResult>;
  sendMagicLink: (email: string) => Promise<SendMagicLinkResult>;
  verifyToken: (token: string) => Promise<Session | null>;
  connectApiKey: (apiKey: string) => Promise<boolean>;
  acceptInvite: (inviteId: string) => Promise<AcceptInviteResult>;
  switchOrganization: (organizationId: string) => Promise<boolean>;
  refreshSession: () => Promise<Session | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'dispatch_session_token';

export function getSessionToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return null;
}

export function setSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

export function clearSessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Track Clerk's active organization so we can re-sync the backend session
  // whenever it changes (an org switch mints a new org-scoped token, but the
  // backend session — which carries orgRole/organizationId — must be refetched
  // for the new org).
  const { isLoaded: clerkLoaded, orgId: clerkOrgId } = useClerkAuth();

  // Refs to prevent race conditions
  const refreshPromiseRef = useRef<Promise<Session | null> | null>(null);
  const isLoggedOutRef = useRef(false);
  // Monotonic counter so a slow, stale refresh (e.g. for a just-left org) can
  // never overwrite the result of a newer one that started after it.
  const refreshSeqRef = useRef(0);

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    // If already refreshing, return the existing promise (deduplication)
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // If logged out, don't refresh
    if (isLoggedOutRef.current) {
      return null;
    }

    const token = getSessionToken() || await getAuthToken();
    if (!token) {
      setSession(null);
      setIsLoading(false);
      return null;
    }

    // Claim a sequence number for this refresh. Only the newest refresh is
    // allowed to write to `session`, so a slow response for an org the user
    // has already switched away from cannot latch a stale role.
    const mySeq = ++refreshSeqRef.current;
    const setSessionIfCurrent = (s: Session | null) => {
      if (!isLoggedOutRef.current && refreshSeqRef.current === mySeq) {
        setSession(s);
      }
    };

    // Create and store the refresh promise
    const refreshPromise = (async (): Promise<Session | null> => {
      try {
        const response = await fetch(`${API_URL}/auth/session`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // Check if logged out during fetch
        if (isLoggedOutRef.current) {
          return null;
        }

        const data = await response.json();

        // Handle "user doesn't belong to org" - they're authenticated but need to connect
        if (response.status === 401 && data.message?.includes('does not belong to an organization')) {
          // Parse email from the JWT token (it's in the payload)
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const newSession: Session = {
              customerId: payload.sub || '',
              email: payload.email || '',
              organizationId: '',
              connected: false,
            };
            setSessionIfCurrent(newSession);
            return newSession;
          } catch {
            // If JWT parsing fails, still keep them "authenticated" for the connect flow
            const newSession: Session = {
              customerId: '',
              email: '',
              organizationId: '',
              connected: false,
            };
            setSessionIfCurrent(newSession);
            return newSession;
          }
        }

        if (!response.ok) {
          clearSessionToken();
          setSessionIfCurrent(null);
          return null;
        }

        if (data.valid) {
          const newSession: Session = {
            customerId: data.customerId,
            memberId: data.memberId,
            email: data.email,
            organizationId: data.organizationId,
            orgRole: data.orgRole,
            connected: data.connected,
            expiresAt: data.expiresAt,
          };
          setSessionIfCurrent(newSession);
          return newSession;
        } else {
          clearSessionToken();
          setSessionIfCurrent(null);
          return null;
        }
      } catch {
        clearSessionToken();
        setSessionIfCurrent(null);
        return null;
      } finally {
        setIsLoading(false);
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  // Re-sync the backend session whenever Clerk finishes loading and whenever
  // the active organization changes. Previously this ran only once on mount,
  // so `session.orgRole`/`organizationId` latched to whatever org happened to
  // be active at hydration — leaving owner/admin-gated UI (API Keys, Billing)
  // hidden after an org switch or a hydration race even though the backend
  // reports the correct role. Clearing the in-flight ref forces a fresh fetch
  // on org change; the sequence guard drops any stale response that lands late.
  useEffect(() => {
    if (!clerkLoaded) return;
    refreshPromiseRef.current = null;
    refreshSession();
  }, [clerkLoaded, clerkOrgId, refreshSession]);

  const checkEmail = async (email: string): Promise<CheckEmailResult> => {
    try {
      const response = await fetch(`${API_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        return { exists: false };
      }

      return await response.json();
    } catch {
      return { exists: false };
    }
  };

  const sendMagicLink = async (email: string): Promise<{ success: boolean; notFound?: boolean }> => {
    try {
      const response = await fetch(`${API_URL}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        // Check if Stackbe returned "Customer not found"
        if (data.message?.includes('Customer not found') || data.message?.includes('not found')) {
          return { success: false, notFound: true };
        }
        return { success: false };
      }

      const data = await response.json();
      return { success: data.success === true };
    } catch {
      return { success: false };
    }
  };

  const verifyToken = async (token: string): Promise<Session | null> => {
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.success && data.sessionToken) {
        // Reset logged out flag on successful login
        isLoggedOutRef.current = false;
        setSessionToken(data.sessionToken);
        const newSession: Session = {
          customerId: data.customerId,
          memberId: data.memberId,
          email: data.email,
          organizationId: data.organizationId,
          connected: data.connected,
        };
        setSession(newSession);
        return newSession;
      }
      return null;
    } catch {
      return null;
    }
  };

  const connectApiKey = async (apiKey: string): Promise<boolean> => {
    const token = getSessionToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/auth/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.success) {
        // Refresh session to get updated connected status
        await refreshSession();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const acceptInvite = async (inviteId: string): Promise<AcceptInviteResult> => {
    const token = getSessionToken();
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${API_URL}/auth/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Failed to accept invite'
        };
      }

      // Refresh session to get updated organization
      await refreshSession();
      return {
        success: true,
        message: 'Invite accepted',
        organizationId: data.organizationId
      };
    } catch {
      return { success: false, message: 'Failed to accept invite' };
    }
  };

  const switchOrganization = async (organizationId: string): Promise<boolean> => {
    const token = getSessionToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/auth/switch-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        // Clear all cached data since we're switching orgs
        queryClient.clear();
        // Refresh session to load new org context
        await refreshSession();
        router.push('/dashboard');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    // Set flag to prevent stale refresh results from updating state
    isLoggedOutRef.current = true;
    clearSessionToken();
    setSession(null);
    router.push('/login');
  };

  const isAuthenticated = session !== null;
  const isConnected = session?.connected ?? false;

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated,
        isLoading,
        isConnected,
        checkEmail,
        sendMagicLink,
        verifyToken,
        connectApiKey,
        acceptInvite,
        switchOrganization,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
