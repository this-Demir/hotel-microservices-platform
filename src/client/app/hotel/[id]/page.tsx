'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getHotelById, getComments } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { RoomCard } from '@/components/RoomCard'
import { ReviewCard } from '@/components/ReviewCard'
import { CommentForm } from '@/components/CommentForm'
import { BookingModal } from '@/components/BookingModal'
import type { SearchResultItem, MockHotel, CommentResponse } from '@/lib/types'

const HotelLocationMap = dynamic(
  () => import('@/components/HotelLocationMap').then((m) => m.HotelLocationMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-100 animate-pulse rounded-xl" /> },
)

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtPrice(n: number) {
  return '$' + n.toLocaleString('en-US')
}
function cn(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(' ')
}

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
)
const StarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>
)

function HotelContent({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoggedIn, token } = useAuth()

  const today = new Date().toISOString().slice(0, 10)
  const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

  const checkIn = searchParams.get('checkIn') || today
  const checkOut = searchParams.get('checkOut') || inThreeDays
  const guestCount = Math.max(1, Math.floor(Number(searchParams.get('guestCount')) || 2))

  const [hotel, setHotel] = useState<MockHotel | null>(null)
  const [hotelLoading, setHotelLoading] = useState(true)
  const [tab, setTab] = useState<'rooms' | 'reviews'>('rooms')
  const [bookingRoom, setBookingRoom] = useState<SearchResultItem | null>(null)
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [averageRating, setAverageRating] = useState(0)

  useEffect(() => {
    setHotelLoading(true)
    getHotelById(id)
      .then(setHotel)
      .catch(() => setHotel(null))
      .finally(() => setHotelLoading(false))
  }, [id])

  useEffect(() => {
    setCommentsLoading(true)
    getComments(id)
      .then((r) => {
        setComments(r.items)
        setTotalCount(r.totalCount)
        setAverageRating(r.averageRating ?? 0)
        setCommentsLoading(false)
      })
      .catch(() => setCommentsLoading(false))
  }, [id])

  if (hotelLoading) {
    return (
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        <h2 className="text-2xl font-bold text-slate-900">Hotel not found</h2>
        <button onClick={() => router.push('/search')} className="mt-4 text-indigo-600 font-semibold">
          ← back to search
        </button>
      </div>
    )
  }

  const avg = averageRating
  const reviewCount = totalCount
  const minPrice = Math.min(...hotel.rooms.map((r) => r.price))
  const minDiscounted = Math.round(minPrice * 0.85)
  const searchQs = new URLSearchParams({ checkIn, checkOut, guestCount: String(guestCount) }).toString()

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="relative h-[420px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hotel.imageUrl} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 max-w-7xl mx-auto px-5 sm:px-8 pb-8 text-white">
          <button onClick={() => router.push(`/search?${searchQs}`)} className="text-sm text-white/80 hover:text-white mb-4">
            ← All results
          </button>
          <div className="flex items-end justify-between gap-5 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-white/90 text-sm mb-2">
                <MapPinIcon className="w-4 h-4" /> {hotel.location}
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">{hotel.name}</h1>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className={cn('w-4 h-4', i < hotel.starRating ? 'text-amber-300' : 'text-white/30')} />
                  ))}
                </div>
                <span className="opacity-90">
                  <span className="font-bold text-base">{avg.toFixed(1)}</span> · {reviewCount} reviews
                </span>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur rounded-2xl px-5 py-3 shadow-lg text-slate-900">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">From</div>
              {isLoggedIn ? (
                <>
                  <div className="text-slate-400 line-through font-medium text-sm">{fmtPrice(minPrice)}</div>
                  <div className="font-extrabold text-emerald-600 text-2xl">{fmtPrice(minDiscounted)}</div>
                  <div className="text-slate-500 text-sm">per night · member rate</div>
                </>
              ) : (
                <>
                  <div className="font-extrabold text-slate-900 text-2xl">{fmtPrice(minPrice)}</div>
                  <div className="text-slate-500 text-sm">per night</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 grid lg:grid-cols-[1fr_320px] gap-10">
        {/* Main */}
        <div>
          <p className="text-slate-700 leading-relaxed text-[15px] max-w-2xl">{hotel.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Free WiFi', 'Pool', 'Breakfast', 'Spa', 'Concierge', 'Pet-friendly', 'Fitness center'].map((a) => (
              <span key={a} className="px-3 py-1.5 rounded-full bg-white ring-1 ring-slate-200 text-xs font-medium text-slate-700">{a}</span>
            ))}
          </div>

          {/* Tabs */}
          <div className="mt-10 border-b border-slate-200 flex gap-1">
            {[
              { id: 'rooms' as const, label: `Rooms (${hotel.rooms.length})` },
              { id: 'reviews' as const, label: `Reviews (${reviewCount})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition',
                  tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {tab === 'rooms' && hotel.rooms.map((r) => (
              <RoomCard
                key={r.roomId}
                room={r}
                isLoggedIn={isLoggedIn}
                onBook={(room) => {
                  if (!isLoggedIn) { router.push('/sign-in'); return }
                  setBookingRoom(room)
                }}
              />
            ))}

            {tab === 'reviews' && (
              <>
                {/* Category averages from real comments */}
                {comments.length > 0 && (
                  <div className="grid sm:grid-cols-4 gap-3 mb-3">
                    {(['Cleanliness', 'Staff', 'Facilities', 'Eco-Friendly'] as const).map((label, i) => {
                      const key = (['cleanliness', 'staff', 'facilities', 'ecoFriendly'] as const)[i]
                      const rated = comments.filter((c) => c.categoryRatings?.[key] != null)
                      const avgC = rated.length > 0
                        ? rated.reduce((a, b) => a + (b.categoryRatings[key] ?? 0), 0) / rated.length
                        : null
                      return (
                        <div key={label} className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-4">
                          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</div>
                          <div className="text-2xl font-extrabold text-slate-900 mt-1">
                            {avgC != null ? avgC.toFixed(1) : '–'}
                            <span className="text-sm font-medium text-slate-400"> / 5</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Write a review (logged-in only) */}
                {isLoggedIn && token && (
                  <CommentForm
                    hotelId={id}
                    token={token}
                    onSubmitted={(c) => {
                      setComments((prev) => [c, ...prev])
                      setTotalCount((n) => n + 1)
                      setAverageRating((prev) => {
                        const newTotal = prev * totalCount + c.overallRating
                        return totalCount > 0 ? newTotal / (totalCount + 1) : c.overallRating
                      })
                    }}
                  />
                )}
                {!isLoggedIn && (
                  <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-5 text-center">
                    <p className="text-sm text-slate-600">
                      <button onClick={() => router.push('/sign-in')} className="text-indigo-600 font-semibold hover:underline">Sign in</button>{' '}
                      to leave a review.
                    </p>
                  </div>
                )}

                {/* Review list */}
                {commentsLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="bg-white rounded-2xl ring-1 ring-slate-200/70 p-8 text-center text-slate-400 text-sm">
                    No reviews yet. Be the first to share your experience!
                  </div>
                ) : (
                  comments.map((c) => <ReviewCard key={c.id} review={c} />)
                )}
              </>
            )}
          </div>
        </div>

        {/* Sticky sidebar */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-5">
            <div className="text-xs uppercase tracking-widest font-bold text-slate-500">Your stay</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Check-in</div>
                <div className="font-semibold mt-0.5">{fmtDate(checkIn)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Check-out</div>
                <div className="font-semibold mt-0.5">{fmtDate(checkOut)}</div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5 mt-3 text-sm">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Guests</div>
              <div className="font-semibold mt-0.5">{guestCount} {guestCount === 1 ? 'guest' : 'guests'}</div>
            </div>
            <button
              onClick={() => {
                if (!isLoggedIn) { router.push('/sign-in'); return }
                setBookingRoom(hotel.rooms[0])
              }}
              className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-full font-semibold transition shadow-md"
            >
              Reserve a room
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-3">Free cancellation up to 48h before check-in</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-5">
            <div className="font-bold text-sm text-slate-900">Need help deciding?</div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Open the chat in the bottom-right to talk to our travel agent about this property.
            </p>
          </div>

          {/* Location map */}
          {(() => {
            const room = hotel.rooms.find((r) => r.latitude != null && r.longitude != null)
            if (!room?.latitude || !room?.longitude) return null
            const lat = room.latitude
            const lng = room.longitude
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
            return (
              <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 overflow-hidden">
                <div className="h-48">
                  <HotelLocationMap lat={lat} lng={lng} />
                </div>
                <div className="p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Location</div>
                  <p className="text-sm text-slate-700 font-medium">{hotel.location}</p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-indigo-600">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    Get Directions
                  </a>
                </div>
              </div>
            )
          })()}
        </aside>
      </div>

      <BookingModal
        open={!!bookingRoom}
        onClose={() => setBookingRoom(null)}
        room={bookingRoom}
        hotel={hotel}
        checkIn={checkIn}
        checkOut={checkOut}
        guestCount={guestCount}
      />
    </div>
  )
}

export default function HotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <HotelContent id={id} />
    </Suspense>
  )
}
