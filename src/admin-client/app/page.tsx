'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminShell from '@/components/AdminShell'
import { getHotels, getAllReservations } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { AdminReservationResponse } from '@/lib/types'

interface Stat {
  label: string
  value: string | number
  sub?: string
}

function StatCard({ label, value, sub }: Stat) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function deriveStatus(checkIn: string, checkOut: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (today < new Date(checkIn)) return 'Upcoming'
  if (today < new Date(checkOut)) return 'Active'
  return 'Completed'
}

export default function DashboardPage() {
  const { isReady, isAdmin, token } = useAuth()
  const router = useRouter()

  const [totalHotels, setTotalHotels] = useState<number | null>(null)
  const [totalReservations, setTotalReservations] = useState<number | null>(null)
  const [recent, setRecent] = useState<AdminReservationResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    if (!isAdmin) { router.replace('/login'); return }
  }, [isReady, isAdmin, router])

  useEffect(() => {
    if (!isReady || !isAdmin || !token) return
    Promise.all([
      getHotels(1, 1, token),
      getAllReservations(token, 1, 5),
    ]).then(([hotels, reservations]) => {
      setTotalHotels(hotels.totalCount)
      setTotalReservations(reservations.totalCount)
      setRecent(reservations.items)
    }).finally(() => setLoading(false))
  }, [isReady, isAdmin, token])

  if (!isReady || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AdminShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your property portfolio</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <StatCard label="Total Hotels" value={totalHotels ?? 0} sub="registered properties" />
            <StatCard label="Total Bookings" value={totalReservations ?? 0} sub="all-time reservations" />
          </div>
        )}

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Bookings</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No bookings yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Hotel</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Room</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Check-in</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Price</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.hotelName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.roomType}</td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums">{r.checkIn}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">${r.pricePaid.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          deriveStatus(r.checkIn, r.checkOut) === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : deriveStatus(r.checkIn, r.checkOut) === 'Upcoming'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {deriveStatus(r.checkIn, r.checkOut)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
