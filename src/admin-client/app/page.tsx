'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function RootPage() {
  const { isReady, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isReady) return
    router.replace(isAdmin ? '/hotels' : '/login')
  }, [isReady, isAdmin, router])

  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
