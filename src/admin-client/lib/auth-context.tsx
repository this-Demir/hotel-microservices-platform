'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const COGNITO_ENDPOINT = 'https://cognito-idp.us-east-1.amazonaws.com/'
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!

interface AuthState {
  isReady: boolean
  isAdmin: boolean
  token: string
  adminEmail: string
  adminSub: string
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [token, setToken] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminSub, setAdminSub] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    const storedEmail = localStorage.getItem('admin_email')
    if (stored && storedEmail) {
      const claims = parseJwt(stored)
      if (claims && (claims.exp as number) * 1000 > Date.now()) {
        setIsAdmin(true)
        setToken(stored)
        setAdminEmail(storedEmail)
        setAdminSub((claims.sub as string) ?? '')
      } else {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_email')
      }
    }
    setIsReady(true)
  }, [])

  async function login(email: string, password: string) {
    if (!email || !password) throw new Error('Email and password are required')

    const res = await fetch(COGNITO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? data.__type ?? 'Login failed')

    const { AccessToken, RefreshToken } = data.AuthenticationResult
    const claims = parseJwt(AccessToken)
    const groups: string[] = (claims?.['cognito:groups'] as string[]) ?? []
    if (!groups.includes('Admin')) throw new Error('Access denied: Admin privileges required')

    const accessClaims = parseJwt(AccessToken)
    localStorage.setItem('admin_token', AccessToken)
    localStorage.setItem('admin_refresh', RefreshToken)
    localStorage.setItem('admin_email', email)
    setToken(AccessToken)
    setAdminEmail(email)
    setAdminSub((accessClaims?.sub as string) ?? '')
    setIsAdmin(true)
  }

  function logout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_refresh')
    localStorage.removeItem('admin_email')
    setToken('')
    setAdminEmail('')
    setAdminSub('')
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ isReady, isAdmin, token, adminEmail, adminSub, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
