'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const COGNITO_ENDPOINT = 'https://cognito-idp.us-east-1.amazonaws.com/'
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!

interface User {
  name: string
  email: string
  sub: string
}

interface AuthContextType {
  isLoggedIn: boolean
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  logout: () => void
}

function cognitoFetch(target: string, body: object) {
  return fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  })
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const applyTokens = useCallback((accessToken: string, idToken: string, refreshToken: string) => {
    localStorage.setItem('se_access', accessToken)
    localStorage.setItem('se_refresh', refreshToken)
    localStorage.setItem('se_id', idToken)
    const claims = parseJwt(idToken)
    setToken(idToken)
    setUser({
      name: (claims?.name as string) ?? (claims?.email as string) ?? '',
      email: (claims?.email as string) ?? '',
      sub: (claims?.sub as string) ?? '',
    })
    setIsLoggedIn(true)
  }, [])

  useEffect(() => {
    const access = localStorage.getItem('se_access')
    const id = localStorage.getItem('se_id')
    const refresh = localStorage.getItem('se_refresh')
    if (!access || !id || !refresh) return

    const claims = parseJwt(access)
    if (claims && (claims.exp as number) * 1000 > Date.now()) {
      applyTokens(access, id, refresh)
      return
    }

    cognitoFetch('InitiateAuth', {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { REFRESH_TOKEN: refresh },
    }).then(async (res) => {
      if (!res.ok) { clearStorage(); return }
      const data = await res.json()
      const r = data.AuthenticationResult
      applyTokens(r.AccessToken, r.IdToken, refresh)
    }).catch(() => clearStorage())
  }, [applyTokens])

  function clearStorage() {
    localStorage.removeItem('se_access')
    localStorage.removeItem('se_refresh')
    localStorage.removeItem('se_id')
  }

  async function login(email: string, password: string) {
    const res = await cognitoFetch('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? data.__type ?? 'Login failed')
    const r = data.AuthenticationResult
    applyTokens(r.AccessToken, r.IdToken, r.RefreshToken)
  }

  async function signUp(name: string, email: string, password: string) {
    const res = await cognitoFetch('SignUp', {
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'name', Value: name },
        { Name: 'email', Value: email },
      ],
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? data.__type ?? 'Sign-up failed')
  }

  async function confirmSignUp(email: string, code: string) {
    const res = await cognitoFetch('ConfirmSignUp', {
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message ?? data.__type ?? 'Confirmation failed')
  }

  function logout() {
    clearStorage()
    setToken(null)
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, token, user, login, signUp, confirmSignUp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
