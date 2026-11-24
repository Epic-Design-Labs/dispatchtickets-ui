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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dispatchtickets.com/v1';

interface Session {
  customerId: string;
  memberId?: string; // Local User.id (for ticket assignment matching)
  email: string;
  organizationId: string;
  orgRole?: string;
  connected: boolean;
  expiresAt?: string;
}

interface AuthContextType {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<Session | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The pre-Clerk session token. Nothing sends it any more; a copy left in a
// browser is removed once, on load.
const LEGACY_SESSION_TOKEN_KEY = 'dispatch_session_token';

function purgeLegacySessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  } catch {
    // Storage blocked.
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
  // Tracks the last-seen Clerk org so we can detect a real switch (vs. the
  // initial resolve) and drop cached org-scoped data for the org we left.
  const prevOrgIdRef = useRef<string | null | undefined>(undefined);

  useEffect(purgeLegacySessionToken, []);

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    // If already refreshing, return the existing promise (deduplication)
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // If logged out, don't refresh
    if (isLoggedOutRef.current) {
      return null;
    }

    const token = await getAuthToken();
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

        if (!response.ok) {
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
          setSessionIfCurrent(null);
          return null;
        }
      } catch {
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
    // On a REAL org switch (not the first resolve after load), drop every
    // cached query. Clerk's org switcher changes the active org on its own,
    // so org-scoped data — brands, tickets, team — would otherwise stay pinned
    // to the org we just left. That stale brand list is what breaks scoped API
    // key creation after a switch.
    const prevOrgId = prevOrgIdRef.current;
    if (prevOrgId !== undefined && prevOrgId !== clerkOrgId) {
      queryClient.clear();
    }
    prevOrgIdRef.current = clerkOrgId;

    refreshPromiseRef.current = null;
    refreshSession();
  }, [clerkLoaded, clerkOrgId, refreshSession, queryClient]);

  const logout = () => {
    // Set flag to prevent stale refresh results from updating state
    isLoggedOutRef.current = true;
    setSession(null);
    router.push('/login');
  };

  const isAuthenticated = session !== null;

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated,
        isLoading,
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
