import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface UserProfile {
  nickname: string
  email: string
  isMinor: boolean
  requiresBarrierFree: boolean
  isForeigner?: boolean
  interests?: string[]
  customization?: {
    outfit: string
    badge: string
  }
  gallery?: string[]
}

interface AuthContextType {
  user: UserProfile | null
  loggedIn: boolean
  login: (
    email: string,
    password: string,
    options: { isMinor: boolean; requiresBarrierFree: boolean },
    provider?: string
  ) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<UserProfile>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('gorong-auth-user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('gorong-auth-user')
      }
    }
  }, [])

  const login = async (
    email: string,
    _password: string,
    options: { isMinor: boolean; requiresBarrierFree: boolean },
    provider?: string
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    const nextUser: UserProfile = {
      nickname: provider
        ? provider === 'google'
          ? '구글 유저'
          : '카카오 유저'
        : '골골이',
      email,
      isMinor: options.isMinor,
      requiresBarrierFree: options.requiresBarrierFree,
      isForeigner: false,
      customization: {
        outfit: '기본',
        badge: '',
      },
      gallery: [],
    }
    localStorage.setItem('gorong-auth-user', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const logout = () => {
    localStorage.removeItem('gorong-auth-user')
    setUser(null)
  }

  const updateUser = (updates: Partial<UserProfile>) => {
    if (user) {
      const updated = { ...user, ...updates }
      setUser(updated)
      localStorage.setItem('gorong-auth-user', JSON.stringify(updated))
    }
  }

  const value = useMemo(
    () => ({ user, loggedIn: Boolean(user), login, logout, updateUser }),
    [user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
