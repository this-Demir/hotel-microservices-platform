'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  name: string
  email: string
}

interface AuthContextType {
  isLoggedIn: boolean
  token: string | null
  user: User | null
  login: (override?: Partial<User>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const FAKE_TOKEN =
  'fake.jwt.token.eyJzdWIiOiJhbGV4LWpvaG5zb24ifQ'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const login = (override: Partial<User> = {}) => {
    setIsLoggedIn(true)
    setUser({ name: 'Alex Johnson', email: 'alex@example.com', ...override })
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, token: isLoggedIn ? FAKE_TOKEN : null, user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
