"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface User {
  _id: string;
  username: string;
  email: string;
}

interface SessionContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  error: null,
  checkSession: async () => {},
  logout: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Session] User data:', data.user);
        setUser(data.user);
        setError(null);
      } else {
        console.log('[Session] Not authenticated');
        setUser(null);
      }
    } catch (err) {
      console.error('[Session] Error checking session:', err);
      setError('Failed to verify session');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (err) {
      console.error('[Session] Error logging out:', err);
      setError('Failed to logout');
    }
  };

  useEffect(() => {
    checkSession();
    
    // Set up an interval to periodically check the session
    const interval = setInterval(checkSession, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, error, checkSession, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
