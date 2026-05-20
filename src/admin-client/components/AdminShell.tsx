'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import { getNotifications } from '@/lib/api'
import type { NotificationResponse } from '@/lib/types'
import { AdminNotificationsPanel } from './AdminNotificationsPanel'

const BellIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { isReady, isAdmin, adminEmail, token, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (isReady && !isAdmin) router.replace('/login')
  }, [isAdmin, isReady, router])

  useEffect(() => {
    if (!isReady || !isAdmin || !token) return
    getNotifications(token).then((r) => setNotifications(r.items as NotificationResponse[]))
  }, [isReady, isAdmin, token])

  const unreadCount = notifications.filter((n) => !n.isRead).length

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
          <NavItem href="/" label="Dashboard" active={pathname === '/'} />
          <NavItem href="/hotels" label="Hotels" active={pathname.startsWith('/hotels')} />
          <NavItem href="/reservations" label="Reservations" active={pathname.startsWith('/reservations')} />
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

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end px-5 shrink-0">
          <button
            onClick={() => setPanelOpen(true)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <AdminNotificationsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        notifications={notifications}
        setNotifications={setNotifications}
      />
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
