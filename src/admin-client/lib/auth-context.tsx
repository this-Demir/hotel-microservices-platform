'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface AuthState {
  isReady: boolean
  isAdmin: boolean
  token: string
  adminEmail: string
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [token, setToken] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    const storedEmail = localStorage.getItem('admin_email')
    if (stored && storedEmail) {
      setIsAdmin(true)
      setToken(stored)
      setAdminEmail(storedEmail)
    }
    setIsReady(true)
  }, [])

  async function login(email: string, password: string) {
    if (!email || !password) throw new Error('Email and password are required')
    // Mock auth — swap for Cognito in Phase 6
    await new Promise((r) => setTimeout(r, 600))
    const mockToken = btoa(`${email}:${Date.now()}`)
    localStorage.setItem('admin_token', mockToken)
    localStorage.setItem('admin_email', email)
    setToken(mockToken)
    setAdminEmail(email)
    setIsAdmin(true)
  }

  function logout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_email')
    setToken('')
    setAdminEmail('')
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ isReady, isAdmin, token, adminEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
