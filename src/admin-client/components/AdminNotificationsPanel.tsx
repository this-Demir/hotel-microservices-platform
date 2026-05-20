'use client'

import type { NotificationResponse } from '@/lib/types'
import { markNotificationRead } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

function cn(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(' ')
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return Math.floor(diff / 86400) + 'd ago'
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

interface Props {
  open: boolean
  onClose: () => void
  notifications: NotificationResponse[]
  setNotifications: React.Dispatch<React.SetStateAction<NotificationResponse[]>>
}

export function AdminNotificationsPanel({ open, onClose, notifications, setNotifications }: Props) {
  const { token } = useAuth()

  const handleClick = async (n: NotificationResponse) => {
    if (n.isRead) return
    await markNotificationRead(n.id, token)
    setNotifications((arr) => arr.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)))
  }

  const markAll = () => {
    notifications.filter((n) => !n.isRead).forEach((n) => markNotificationRead(n.id, token))
    setNotifications((arr) => arr.map((x) => ({ ...x, isRead: true })))
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className={cn('fixed inset-0 z-40 transition-all', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div
        onClick={onClose}
        className={cn('absolute inset-0 bg-slate-900/40 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
      />
      <aside
        className={cn(
          'absolute right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-bold text-base text-slate-900">Capacity Alerts</h3>
            <p className="text-xs text-slate-500 mt-0.5">{unreadCount} unread</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 grid place-items-center text-slate-600 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No alerts — all rooms have healthy capacity.</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full text-left px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition flex gap-3',
                  !n.isRead && 'bg-amber-50/50',
                )}
              >
                <div className="pt-1.5 shrink-0">
                  <div className={cn('w-2.5 h-2.5 rounded-full', n.isRead ? 'bg-transparent border border-slate-300' : 'bg-amber-500')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={cn('text-sm', n.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900')}>{n.title}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{relTime(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.body}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={markAll}
              className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
