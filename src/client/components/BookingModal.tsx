'use client'

import { useState, useEffect } from 'react'
import { bookRoom } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { SearchResultItem } from '@/lib/types'

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtPrice(n: number) {
  return '$' + n.toLocaleString('en-US')
}

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m20 6-11 11-5-5" />
  </svg>
)

interface BookingModalProps {
  open?: boolean
  room: SearchResultItem | null
  hotel?: { name: string } | null
  checkIn: string
  checkOut: string
  guestCount: number
  onClose: () => void
}

export function BookingModal({ open = true, room, hotel, checkIn, checkOut, guestCount, onClose }: BookingModalProps) {
  const { isLoggedIn, token, user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (open && user) { setName(user.name); setEmail(user.email) }
  }, [open, user])

  if (!open || !room) return null

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
  const base = room.price * nights
  const discounted = Math.round(base * 0.85)
  const total = isLoggedIn ? discounted : base

  const imageUrl = room.hotelImageUrl ?? `https://picsum.photos/seed/${room.hotelId}/1200/800`

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSubmitting(true)
    try {
      await bookRoom({ roomId: room.roomId, checkIn, checkOut, guestCount }, token)
      setToast('Booking confirmed! Check your email for details.')
      setTimeout(() => { setToast(''); onClose() }, 2500)
    } catch {
      setToast('Something went wrong. Please try again.')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up max-h-[92vh] overflow-y-auto nice-scroll"
      >
        {/* Hero */}
        <div className="relative h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white grid place-items-center text-slate-700">
            <XIcon className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="text-xs font-medium opacity-90">{hotel?.name ?? room.hotelName}</div>
            <div className="font-bold text-xl">{room.roomType}</div>
          </div>
        </div>

        <form onSubmit={submit} className="p-6">
          {/* Date summary */}
          <div className="grid grid-cols-3 gap-3 text-center mb-5">
            <div className="bg-slate-50 rounded-xl py-3">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Check-in</div>
              <div className="font-semibold text-sm mt-0.5">{fmtDate(checkIn)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl py-3">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Check-out</div>
              <div className="font-semibold text-sm mt-0.5">{fmtDate(checkOut)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl py-3">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Guests</div>
              <div className="font-semibold text-sm mt-0.5">{guestCount}</div>
            </div>
          </div>

          {/* Guest fields */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Guest name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              />
            </label>
          </div>

          {/* Price breakdown */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-50 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{fmtPrice(room.price)} × {nights} {nights === 1 ? 'night' : 'nights'}</span>
              <span>{fmtPrice(base)}</span>
            </div>
            {isLoggedIn && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Member discount (15%)</span>
                <span>−{fmtPrice(base - discounted)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-extrabold text-xl text-slate-900">{fmtPrice(total)}</span>
            </div>
          </div>

          <button
            disabled={submitting}
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-3.5 rounded-2xl transition shadow-md flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
          <p className="text-[11px] text-slate-500 text-center mt-3">
            You won&apos;t be charged yet. Cancel free up to 48 hours before check-in.
          </p>
        </form>

        {/* Toast */}
        {toast && (
          <div className={`toast absolute bottom-4 left-4 right-4 px-5 py-3 rounded-full shadow-2xl text-sm font-medium flex items-center gap-2 text-white ${toast.includes('confirmed') ? 'bg-slate-900' : 'bg-red-600'}`}>
            <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" /> {toast}
          </div>
        )}
      </div>
    </div>
  )
}
