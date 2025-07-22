"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { apiClient } from "@/lib/api-client"

export interface User {
  _id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  branch?: string
  isAlumni?: boolean
  profilePic?: string
  bio?: string
  socialLinks?: {
    instagram?: string
    x?: string
    github?: string
    portfolio?: string
  }
  interests?: string[]
  location?: string
  learningPath?: string
  dateOfBirth?: string
  followers: string[]
  following: string[]
  createdAt: string
  lastActive?: string
  status?: string
  role?: string
  preferences?: {
    anonymousMode?: boolean
    receiveNotifications?: boolean
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (data: {
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
    branch: string
    isAlumni: boolean
  }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  const refreshUser = async () => {
    const now = Date.now();
    // Prevent refresh if less than 5 minutes since last refresh
    if (now - lastRefresh < 5 * 60 * 1000) {
      return;
    }

    try {
      const response = await apiClient.getCurrentUser() as { user: User };
      setUser(response.user);
      setLastRefresh(now);
    } catch (error) {
      console.error('[Auth] Error refreshing user:', error);
      // Only clear auth if it's an authentication error
      if ((error as any)?.response?.status === 401) {
        setUser(null);
        // Clear auth token from both localStorage and cookies
        localStorage.removeItem("auth-token");
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }
  };

  type LoginResponse = { user: User; token: string };
  const login = async (identifier: string, password: string) => {
    try {
      const response = (await apiClient.login({ identifier, password })) as LoginResponse;
      setUser(response.user);
      if (response.token) {
        // Set both cookie and localStorage
        document.cookie = `auth-token=${response.token}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}`; // 7 days
        localStorage.setItem("auth-token", response.token);
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  };

  const register = async (data: {
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
    branch: string
    isAlumni: boolean
  }) => {
    try {
      const response = await apiClient.register(data);
      setUser(response.user);
      if (response.token) {
        document.cookie = `auth-token=${response.token}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}`;
        localStorage.setItem("auth-token", response.token);
      }
      return response;
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      throw error;
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout();
      setUser(null);
      // Clear auth data from both localStorage and cookies
      localStorage.removeItem("auth-token");
      document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      throw error;
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("auth-token");
        if (token) {
          // Verify the token exists in cookies as well
          const cookieToken = document.cookie.split('; ').find(row => row.startsWith('auth-token='));
          if (!cookieToken) {
            // Sync the token to cookies if it only exists in localStorage
            document.cookie = `auth-token=${token}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}`;
          }
          await refreshUser();
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Clear any existing refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    initAuth();

    // Set up a single refresh interval if we have a token
    if (localStorage.getItem("auth-token")) {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshUser();
      }, 15 * 60 * 1000); // Check every 15 minutes
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []) // Empty dependency array - only run on mount

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
