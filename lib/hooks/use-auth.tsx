"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { apiClient } from "@/lib/api-client"

interface User {
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
  login: (email: string, password: string) => Promise<void>
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const response = await apiClient.getCurrentUser() as { user: User }
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

  const register = async (data: {
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
    branch: string
    isAlumni: boolean
  }) => {
    const response = await apiClient.register(data)
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
