'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { searchHotels } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { HotelCard } from '@/components/HotelCard'
import { SkeletonCard } from '@/components/SkeletonCard'
import { MapPlaceholder } from '@/components/MapPlaceholder'
import { SearchCard } from '@/components/SearchCard'
import { mockHotels } from '@/lib/mock-data'
import type { SearchResultItem } from '@/lib/types'

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

const ListViewIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)
const MapViewIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="5" x2="15" y2="21" />
  </svg>
)
const StarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>
)

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoggedIn } = useAuth()

  const location = searchParams.get('location') ?? ''
  const checkIn = searchParams.get('checkIn') ?? new Date().toISOString().slice(0, 10)
  const checkOut = searchParams.get('checkOut') ?? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const guestCount = Number(searchParams.get('guestCount') ?? 2)

  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [priceMax, setPriceMax] = useState(700)
  const [stars, setStars] = useState<Record<number, boolean>>({ 5: false, 4: false, 3: false })

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    searchHotels({ location, checkIn, checkOut, guestCount })
      .then((res) => { if (alive) { setResults(res.items); setLoading(false) } })
      .catch(() => { if (alive) { setError('Could not reach the server. Please try again.'); setLoading(false) } })
    return () => { alive = false }
  }, [location, checkIn, checkOut, guestCount])

  const hotelsById = useMemo(
    () => Object.fromEntries(mockHotels.map((h) => [h.id, h])),
    [],
  )

  const items = useMemo(() => {
    const activeStars = Object.entries(stars).filter(([, v]) => v).map(([k]) => Number(k))
    return results.filter((r) => {
      if (r.price > priceMax) return false
      if (activeStars.length) {
        const s = hotelsById[r.hotelId]?.starRating ?? 0
        if (!activeStars.includes(s)) return false
      }
      return true
    })
  }, [results, priceMax, stars, hotelsById])

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Search bar strip */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5">
          <SearchCard initialLocation={location} initialCheckIn={checkIn} initialCheckOut={checkOut} initialGuests={guestCount} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 grid lg:grid-cols-[280px_1fr] gap-7">
        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Price range */}
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-5">
            <h4 className="font-bold text-sm uppercase tracking-wide text-slate-700">Price per night</h4>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>$0</span><span>{fmtPrice(priceMax)}</span>
              </div>
              <input
                type="range" min="50" max="800" step="10" value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full mt-2 accent-indigo-600"
              />
              <div className="text-xs text-slate-500 mt-2">
                Showing rooms up to <span className="font-bold text-slate-900">{fmtPrice(priceMax)}</span>
              </div>
            </div>
          </div>

          {/* Star rating */}
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-5">
            <h4 className="font-bold text-sm uppercase tracking-wide text-slate-700">Star rating</h4>
            <div className="mt-3 space-y-2">
              {[5, 4, 3].map((s) => (
                <label key={s} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={stars[s]}
                    onChange={(e) => setStars((x) => ({ ...x, [s]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} className={`w-3.5 h-3.5 ${i < s ? 'text-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 ml-auto group-hover:text-slate-700">{s}+</span>
                </label>
              ))}
            </div>
          </div>

          {/* Property type */}
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-5">
            <h4 className="font-bold text-sm uppercase tracking-wide text-slate-700">Property type</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {['Hotel', 'Resort', 'Boutique', 'Apartment'].map((t) => (
                <label key={t} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked={t === 'Hotel'} className="w-4 h-4 rounded accent-indigo-600" />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Member upsell */}
          {!isLoggedIn && (
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-md">
              <div className="text-xs font-bold uppercase tracking-widest opacity-80">Member perk</div>
              <div className="mt-1 font-bold text-lg leading-tight">Sign in for 15% off every stay</div>
              <button
                onClick={() => router.push('/sign-in')}
                className="mt-4 w-full py-2.5 rounded-full bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition"
              >
                Sign in
              </button>
            </div>
          )}
        </aside>

        {/* Results */}
        <main>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {loading ? 'Searching…' : `${items.length} ${items.length === 1 ? 'stay' : 'stays'} found`}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {location ? <><span className="font-semibold text-slate-700">{location}</span> · </> : 'All destinations · '}
                {fmtDate(checkIn)} → {fmtDate(checkOut)} · {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
              </p>
            </div>
            <div className="flex items-center bg-white rounded-full ring-1 ring-slate-200 shadow-sm p-1">
              <button
                onClick={() => setView('list')}
                className={cn('px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-semibold transition', view === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900')}
              >
                <ListViewIcon className="w-4 h-4" /> List
              </button>
              <button
                onClick={() => setView('map')}
                className={cn('px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-semibold transition', view === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900')}
              >
                <MapViewIcon className="w-4 h-4" /> Map
              </button>
            </div>
          </div>

          {view === 'list' ? (
            <div className="space-y-5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              ) : error ? (
                <div className="bg-white rounded-2xl shadow-md ring-1 ring-red-200 p-14 text-center">
                  <div className="text-5xl mb-3">⚠️</div>
                  <h3 className="font-bold text-lg text-slate-900">Something went wrong</h3>
                  <p className="text-sm text-slate-500 mt-1">{error}</p>
                </div>
              ) : items.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-14 text-center">
                  <div className="text-5xl mb-3">🔍</div>
                  <h3 className="font-bold text-lg text-slate-900">No matches</h3>
                  <p className="text-sm text-slate-500 mt-1">Try relaxing your filters or searching a different destination.</p>
                </div>
              ) : (
                items.map((item) => (
                  <HotelCard
                    key={item.roomId}
                    item={item}
                    hotel={hotelsById[item.hotelId]}
                    isLoggedIn={isLoggedIn}
                    onView={() => {
                      const qs = new URLSearchParams({ checkIn, checkOut, guestCount: String(guestCount) })
                      router.push(`/hotel/${item.hotelId}?${qs}`)
                    }}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="h-[calc(100vh-260px)] min-h-[500px]">
              <MapPlaceholder
                hotels={mockHotels}
                onPick={(h) => {
                  const qs = new URLSearchParams({ checkIn, checkOut, guestCount: String(guestCount) })
                  router.push(`/hotel/${h.id}?${qs}`)
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
