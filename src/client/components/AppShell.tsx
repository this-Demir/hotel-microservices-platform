'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { NotificationsPanel } from '@/components/NotificationsPanel'
import { ChatWidget } from '@/components/ChatWidget'
import { useAuth } from '@/lib/auth-context'
import { getNotifications } from '@/lib/api'
import type { NotificationResponse } from '@/lib/types'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, token } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])

  useEffect(() => {
    if (!isLoggedIn || !token) { setNotifications([]); return }
    const fetch = () => getNotifications(token).then((res) => setNotifications(res.items)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [isLoggedIn, token])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <>
      <Header onBellClick={() => setNotifOpen(true)} unreadCount={unreadCount} />
      <main className="flex-1">{children}</main>
      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        setNotifications={setNotifications}
      />
      <ChatWidget />
    </>
  )
}
