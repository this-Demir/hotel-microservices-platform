'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { searchHotels } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { HotelCard } from '@/components/HotelCard'
import { HotelCardCompact } from '@/components/HotelCardCompact'
import { SkeletonCard } from '@/components/SkeletonCard'
import { SearchCard } from '@/components/SearchCard'
import { mockHotels } from '@/lib/mock-data'
import type { SearchResultItem } from '@/lib/types'

const InteractiveMap = dynamic(
  () => import('@/components/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-100 animate-pulse rounded-2xl" /> },
)

// ── Icons ──────────────────────────────────────────────────────────────────
function ListViewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
function SplitViewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="4" width="8" height="16" rx="1.5" /><rect x="13" y="4" width="8" height="16" rx="1.5" />
    </svg>
  )
}
function MapViewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="5" x2="15" y2="21" />
    </svg>
  )
}
const StarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>
)

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtPrice(n: number) { return '$' + n.toLocaleString('en-US') }
function cn(...xs: (string | false | undefined | null)[]) { return xs.filter(Boolean).join(' ') }

// ── Main content ───────────────────────────────────────────────────────────
function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoggedIn } = useAuth()

  const location   = searchParams.get('location') ?? ''
  const checkIn    = searchParams.get('checkIn')  || new Date().toISOString().slice(0, 10)
  const checkOut   = searchParams.get('checkOut') || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const guestCount = Math.max(1, Math.floor(Number(searchParams.get('guestCount')) || 2))

  const [results,     setResults]     = useState<SearchResultItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [page,        setPage]        = useState(1)
  const [totalCount,  setTotalCount]  = useState(0)
  const [view,        setView]        = useState<'list' | 'split' | 'map'>('split')
  const [priceMax,    setPriceMax]    = useState(700)
  const [stars,       setStars]       = useState<Record<number, boolean>>({ 5: false, 4: false, 3: false })
  const [hoveredId,   setHoveredId]   = useState<string | null>(null)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)

  const PAGE_SIZE = 10
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setSelectedId(null)
    setPage(1)
    searchHotels({ location, checkIn, checkOut, guestCount, page: 1, pageSize: PAGE_SIZE })
      .then((res) => {
        if (alive) {
          setResults(res.items)
          setTotalCount(res.totalCount)
          setLoading(false)
        }
      })
      .catch(() => { if (alive) { setError('Could not reach the server. Please try again.'); setLoading(false) } })
    return () => { alive = false }
  }, [location, checkIn, checkOut, guestCount])

  async function loadMore() {
    if (loadingMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const res = await searchHotels({ location, checkIn, checkOut, guestCount, page: nextPage, pageSize: PAGE_SIZE })
      setResults((prev) => [...prev, ...res.items])
      setTotalCount(res.totalCount)
      setPage(nextPage)
    } finally {
      setLoadingMore(false)
    }
  }

  // scroll card into view when a map pin is selected
  useEffect(() => {
    if (!selectedId) return
    const el = cardRefs.current[selectedId]
    const parent = el?.closest('[data-list-scroll]') as HTMLElement | null
    if (parent && el) parent.scrollTo({ top: el.offsetTop - parent.offsetTop - 12, behavior: 'smooth' })
  }, [selectedId])

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

  function goToHotel(hotelId: string) {
    const qs = new URLSearchParams({ checkIn, checkOut, guestCount: String(guestCount) })
    router.push(`/hotel/${hotelId}?${qs}`)
  }

  // ── Shared sub-elements ─────────────────────────────────────────────────
  const resultsHeader = (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          {loading ? 'Searching…' : totalCount > 0
            ? `Showing ${items.length} of ${totalCount} ${totalCount === 1 ? 'stay' : 'stays'}`
            : 'No stays found'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {location ? <><span className="font-semibold text-slate-700">{location}</span> · </> : 'All destinations · '}
          {fmtDate(checkIn)} → {fmtDate(checkOut)} · {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
        </p>
      </div>
    </div>
  )

  const emptyState = (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-14 text-center">
      <div className="text-5xl mb-3">🔍</div>
      <h3 className="font-bold text-lg text-slate-900">No matches</h3>
      <p className="text-sm text-slate-500 mt-1">Try relaxing your filters or searching a different destination.</p>
    </div>
  )

  const viewToggle = (
    <div className="flex items-center bg-slate-100 rounded-full p-1 ring-1 ring-slate-200/70">
      {([
        { id: 'list',  label: 'List',  Icon: ListViewIcon  },
        { id: 'split', label: 'Split', Icon: SplitViewIcon },
        { id: 'map',   label: 'Map',   Icon: MapViewIcon   },
      ] as const).map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          className={cn(
            'px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-semibold transition',
            view === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          <Icon className="w-4 h-4" /> {label}
        </button>
      ))}
    </div>
  )

  const memberUpsell = !isLoggedIn && !loading && items.length > 0 && (
    <div className="mt-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-md flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Member perk</div>
        <div className="mt-0.5 font-bold leading-tight">Sign in for 15% off every stay</div>
      </div>
      <button
        onClick={() => router.push('/sign-in')}
        className="px-5 py-2.5 rounded-full bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition shrink-0"
      >
        Sign in
      </button>
    </div>
  )

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* ── Sticky search + filter bar ─────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-sm">
        <div className={cn('mx-auto px-5 sm:px-8 py-4', view === 'split' ? 'max-w-[1800px]' : 'max-w-7xl')}>
          <SearchCard initialLocation={location} initialCheckIn={checkIn} initialCheckOut={checkOut} initialGuests={guestCount} />
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            {/* filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Price */}
              <div className="group relative">
                <button className={cn('px-4 py-2 rounded-full text-sm font-semibold ring-1 transition whitespace-nowrap',
                  priceMax < 700 ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:ring-slate-400')}>
                  Price{priceMax < 700 ? ` · ≤ ${fmtPrice(priceMax)}` : ''}
                </button>
                <div className="absolute z-30 top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 p-5 w-72 hidden group-focus-within:block">
                  <div className="font-bold text-sm text-slate-800">Price per night</div>
                  <div className="mt-3 flex justify-between text-xs text-slate-500 font-medium">
                    <span>$0</span><span>{fmtPrice(priceMax)}</span>
                  </div>
                  <input type="range" min="50" max="800" step="10" value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full mt-2 accent-indigo-600" />
                </div>
              </div>

              {/* Stars */}
              <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 px-4 py-2 flex items-center gap-3">
                {[5, 4, 3].map((s) => (
                  <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={stars[s]}
                      onChange={(e) => setStars((x) => ({ ...x, [s]: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded accent-indigo-600" />
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: s }).map((_, i) => (
                        <StarIcon key={i} className="w-3 h-3 text-amber-400" />
                      ))}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* view toggle */}
            {viewToggle}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SPLIT VIEW — Airbnb-style                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {view === 'split' && (
        <div className="grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr] max-w-[1800px] mx-auto">
          {/* left: scrollable card grid */}
          <div
            data-list-scroll
            className="px-5 sm:px-8 py-6 overflow-y-auto nice-scroll"
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {resultsHeader}
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden ring-1 ring-slate-200/70">
                    <div className="h-48 skeleton-shimmer" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-2/3 rounded skeleton-shimmer" />
                      <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                      <div className="h-3 w-1/3 rounded skeleton-shimmer mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl shadow-md ring-1 ring-red-200 p-14 text-center">
                <div className="text-5xl mb-3">⚠️</div>
                <h3 className="font-bold text-lg text-slate-900">Something went wrong</h3>
                <p className="text-sm text-slate-500 mt-1">{error}</p>
              </div>
            ) : items.length === 0 ? emptyState : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <div key={item.roomId} ref={(el) => { cardRefs.current[item.hotelId] = el }}>
                      <HotelCardCompact
                        item={item}
                        hotel={hotelsById[item.hotelId]}
                        isLoggedIn={isLoggedIn}
                        isHovered={hoveredId === item.hotelId}
                        isSelected={selectedId === item.hotelId}
                        onMouseEnter={() => setHoveredId(item.hotelId)}
                        onMouseLeave={() => setHoveredId(null)}
                        onView={() => goToHotel(item.hotelId)}
                      />
                    </div>
                  ))}
                </div>
                {results.length < totalCount && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                      {loadingMore ? 'Loading…' : `Show more (${totalCount - results.length} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}
            {memberUpsell}
          </div>

          {/* right: sticky map */}
          <div className="hidden lg:block sticky" style={{ top: '154px', height: 'calc(100vh - 154px)' }}>
            <div className="h-full p-4">
              <InteractiveMap
                items={items}
                hoveredId={hoveredId}
                selectedId={selectedId}
                onHover={setHoveredId}
                onSelect={setSelectedId}
                isLoggedIn={isLoggedIn}
                onView={goToHotel}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LIST VIEW                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 grid lg:grid-cols-[280px_1fr] gap-7">
          {/* sidebar filters */}
          <aside className="space-y-5">
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-5">
              <h4 className="font-bold text-sm uppercase tracking-wide text-slate-700">Price per night</h4>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>$0</span><span>{fmtPrice(priceMax)}</span>
                </div>
                <input type="range" min="50" max="800" step="10" value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="w-full mt-2 accent-indigo-600" />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-5">
              <h4 className="font-bold text-sm uppercase tracking-wide text-slate-700">Star rating</h4>
              <div className="mt-3 space-y-2">
                {[5, 4, 3].map((s) => (
                  <label key={s} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={stars[s]}
                      onChange={(e) => setStars((x) => ({ ...x, [s]: e.target.checked }))}
                      className="w-4 h-4 rounded accent-indigo-600" />
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
            {!isLoggedIn && (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-md">
                <div className="text-xs font-bold uppercase tracking-widest opacity-80">Member perk</div>
                <div className="mt-1 font-bold text-lg leading-tight">Sign in for 15% off every stay</div>
                <button onClick={() => router.push('/sign-in')}
                  className="mt-4 w-full py-2.5 rounded-full bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition">
                  Sign in
                </button>
              </div>
            )}
          </aside>

          <main>
            {resultsHeader}
            <div className="space-y-5">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                : error
                  ? (
                    <div className="bg-white rounded-2xl shadow-md ring-1 ring-red-200 p-14 text-center">
                      <div className="text-5xl mb-3">⚠️</div>
                      <h3 className="font-bold text-lg text-slate-900">Something went wrong</h3>
                      <p className="text-sm text-slate-500 mt-1">{error}</p>
                    </div>
                  )
                  : items.length === 0 ? emptyState
                    : (
                      <>
                        {items.map((item) => (
                          <HotelCard
                            key={item.roomId}
                            item={item}
                            hotel={hotelsById[item.hotelId]}
                            isLoggedIn={isLoggedIn}
                            onView={() => goToHotel(item.hotelId)}
                          />
                        ))}
                        {results.length < totalCount && (
                          <div className="flex justify-center pt-4">
                            <button
                              onClick={loadMore}
                              disabled={loadingMore}
                              className="px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition"
                            >
                              {loadingMore ? 'Loading…' : `Show more (${totalCount - results.length} remaining)`}
                            </button>
                          </div>
                        )}
                      </>
                    )
              }
            </div>
          </main>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MAP VIEW — full bleed                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {view === 'map' && (
        <div className="max-w-[1800px] mx-auto px-5 sm:px-8 py-6">
          {resultsHeader}
          <div className="h-[calc(100vh-260px)] min-h-[500px]">
            <InteractiveMap
              items={items}
              hoveredId={hoveredId}
              selectedId={selectedId}
              onHover={setHoveredId}
              onSelect={setSelectedId}
              isLoggedIn={isLoggedIn}
              onView={goToHotel}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}
