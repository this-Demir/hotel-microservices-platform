'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getReservations } from '@/lib/api'
import type { ReservationResponse, PagedResult } from '@/lib/types'

function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isUpcoming(checkIn: string) {
  return new Date(checkIn) >= new Date(new Date().toDateString())
}

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const BedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" /><path d="M2 10V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" /><line x1="6" y1="14" x2="18" y2="14" />
  </svg>
)

function BookingCard({ r }: { r: ReservationResponse }) {
  const nights = nightsBetween(r.checkIn, r.checkOut)
  const upcoming = isUpcoming(r.checkIn)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Icon block */}
      <div className="w-14 h-14 rounded-xl bg-indigo-50 flex-shrink-0 grid place-items-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-indigo-500">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-900 text-base truncate">{r.hotelName}</h3>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${upcoming ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {upcoming ? 'Upcoming' : 'Past'}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{r.roomType}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarIcon />
            {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
            <span className="text-slate-400">({nights} {nights === 1 ? 'night' : 'nights'})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <UsersIcon />
            {r.guestCount} {r.guestCount === 1 ? 'guest' : 'guests'}
          </span>
          <span className="flex items-center gap-1.5">
            <BedIcon />
            {r.roomType}
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold text-slate-900">${r.pricePaid.toFixed(2)}</p>
        <p className="text-xs text-slate-400">total paid</p>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-1/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="w-20 space-y-2">
        <div className="h-5 bg-slate-100 rounded" />
        <div className="h-3 bg-slate-100 rounded w-3/4 ml-auto" />
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const { isLoggedIn, token } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<PagedResult<ReservationResponse> | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/sign-in')
    }
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!isLoggedIn || !token) return
    setLoading(true)
    setError(null)
    getReservations(token, page)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [isLoggedIn, token, page])

  if (!isLoggedIn) return null

  const totalPages = data ? Math.ceil(data.totalCount / (data.pageSize || 10)) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-sm text-slate-500 mt-1">Your reservation history</p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">Failed to load bookings</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <button
              onClick={() => setPage((p) => p)}
              className="mt-3 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 grid place-items-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-slate-400">
                <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No bookings yet</h3>
            <p className="text-slate-400 text-sm mt-1">Your reservations will appear here after you book a stay.</p>
            <button
              onClick={() => router.push('/search')}
              className="mt-5 px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
            >
              Find a hotel
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {data.items.map((r) => <BookingCard key={r.id} r={r} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}

            <p className="text-xs text-center text-slate-400 mt-4">{data.totalCount} reservation{data.totalCount !== 1 ? 's' : ''} total</p>
          </>
        )}
      </div>
    </div>
  )
}
