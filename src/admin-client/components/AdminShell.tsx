'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { isReady, isAdmin, adminEmail, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isReady && !isAdmin) router.replace('/login')
  }, [isAdmin, isReady, router])

  if (!isReady || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-700">
          <p className="text-white font-bold text-base tracking-tight">StayEase</p>
          <p className="text-slate-400 text-xs mt-0.5">Admin Panel</p>
          <p className="text-slate-300 text-xs mt-2 truncate">{adminEmail}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem href="/hotels" label="Hotels" active={pathname.startsWith('/hotels')} />
        </nav>

        <div className="border-t border-slate-700 p-3">
          <button
            onClick={() => { logout(); router.replace('/login') }}
            className="w-full text-left px-3 py-2 rounded text-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}
