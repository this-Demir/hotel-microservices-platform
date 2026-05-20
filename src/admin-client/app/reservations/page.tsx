'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminShell from '@/components/AdminShell'
import { getAllReservations } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { AdminReservationResponse } from '@/lib/types'

const PAGE_SIZE = 20

function deriveStatus(checkIn: string, checkOut: string): { label: string; color: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  if (today < inDate) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' }
  if (today < outDate) return { label: 'Active', color: 'bg-green-100 text-green-700' }
  return { label: 'Completed', color: 'bg-slate-100 text-slate-600' }
}

export default function ReservationsPage() {
  const { token } = useAuth()
  const [reservations, setReservations] = useState<AdminReservationResponse[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const result = await getAllReservations(token, page, PAGE_SIZE)
      setReservations(result.items)
      setTotalCount(result.totalCount)
    } finally {
      setLoading(false)
    }
  }, [page, token])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <AdminShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500 mt-1">{totalCount} total booking{totalCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
          ) : reservations.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No reservations yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Hotel</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Room</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Check-in</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Check-out</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">Guests</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Price Paid</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Guest ID</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => {
                    const status = deriveStatus(r.checkIn, r.checkOut)
                    return (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.hotelName}</td>
                        <td className="px-4 py-3 text-gray-600">{r.roomType}</td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">{r.checkIn}</td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">{r.checkOut}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{r.guestCount}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">${r.pricePaid.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[140px]" title={r.userId}>
                          {r.userId.slice(0, 8)}…
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
