'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getReservations } from '@/lib/api'

function initials(name: string) {
  const s = name.split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
  return s || '?'
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 py-3.5 border-b border-slate-100 last:border-0">
      <dt className="text-sm text-slate-500 sm:w-36 flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 break-all">{value}</dd>
    </div>
  )
}

export default function AccountPage() {
  const { isLoggedIn, user, logout } = useAuth()
  const router = useRouter()
  const { token } = useAuth()
  const [bookingCount, setBookingCount] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/sign-in')
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!isLoggedIn || !token) return
    getReservations(token, 1, 1)
      .then((d) => setBookingCount(d.totalCount))
      .catch(() => null)
  }, [isLoggedIn, token])

  if (!isLoggedIn || !user) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
          <p className="text-sm text-slate-500 mt-1">Your profile and membership details</p>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white text-xl font-bold flex-shrink-0">
              {initials(user.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Member — 15% discount on all stays
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-indigo-600">
              {bookingCount === null ? '—' : bookingCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Total Bookings</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-indigo-600">15%</p>
            <p className="text-xs text-slate-500 mt-1">Member Discount</p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Account Details</h3>
          <dl>
            <InfoRow label="Full name" value={user.name} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="User ID" value={user.sub} />
          </dl>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 mb-6">
          <button
            onClick={() => router.push('/bookings')}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition rounded-t-2xl"
          >
            <span className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 grid place-items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-indigo-500">
                  <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </span>
              My Bookings
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/search')}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition rounded-b-2xl"
          >
            <span className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 grid place-items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-indigo-500">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              Search Hotels
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Sign out */}
        <button
          onClick={() => { logout(); router.push('/') }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
