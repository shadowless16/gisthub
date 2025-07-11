"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { apiClient } from "@/lib/api-client"

interface User {
  _id: string
  username: string
  email: string
  profilePic?: string
  bio?: string
  followers: string[]
  following: string[]
  createdAt: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const response = await apiClient.getCurrentUser()
      setUser(response.user)
    } catch (error) {
      setUser(null)
      localStorage.removeItem("auth-token")
    }
  }

  type LoginResponse = { user: User; token: string }
  const login = async (email: string, password: string) => {
    const response = (await apiClient.login({ email, password })) as LoginResponse
    setUser(response.user)
    if (response.token) {
      // Set cookie for server-side middleware
      document.cookie = `auth-token=${response.token}; path=/; SameSite=Lax`
    }
  }

  const register = async (username: string, email: string, password: string) => {
    const response = await apiClient.register({ username, email, password })
    setUser(response.user)
  }

  const logout = async () => {
    await apiClient.logout()
    setUser(null)
  }

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("auth-token")
      if (token) {
        await refreshUser()
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
