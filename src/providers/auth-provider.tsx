'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dispatch-tickets-api.onrender.com/v1';

interface Session {
  customerId: string;
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
  isConnected: boolean;
  sendMagicLink: (email: string) => Promise<boolean>;
  verifyToken: (token: string) => Promise<Session | null>;
  connectApiKey: (apiKey: string) => Promise<boolean>;
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

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    const token = getSessionToken();
    if (!token) {
      setSession(null);
      setIsLoading(false);
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
          setSession(newSession);
          return newSession;
        } catch {
          // If JWT parsing fails, still keep them "authenticated" for the connect flow
          const newSession: Session = {
            customerId: '',
            email: '',
            organizationId: '',
            connected: false,
          };
          setSession(newSession);
          return newSession;
        }
      }

      if (!response.ok) {
        clearSessionToken();
        setSession(null);
        return null;
      }

      if (data.valid) {
        const newSession: Session = {
          customerId: data.customerId,
          email: data.email,
          organizationId: data.organizationId,
          orgRole: data.orgRole,
          connected: data.connected,
          expiresAt: data.expiresAt,
        };
        setSession(newSession);
        return newSession;
      } else {
        clearSessionToken();
        setSession(null);
        return null;
      }
    } catch {
      clearSessionToken();
      setSession(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const sendMagicLink = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success === true;
    } catch {
      return false;
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
        setSessionToken(data.sessionToken);
        const newSession: Session = {
          customerId: data.customerId,
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

  const logout = () => {
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
        sendMagicLink,
        verifyToken,
        connectApiKey,
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
