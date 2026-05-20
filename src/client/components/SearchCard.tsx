'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mockCities } from '@/lib/mock-data'

function cn(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(' ')
}

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
)
const CalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const UsersIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const SearchIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
)
const MinusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14" />
  </svg>
)
const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

interface SearchCardProps {
  initialLocation?: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  dark?: boolean
}

export function SearchCard({
  initialLocation = '',
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuests = 2,
  dark = false,
}: SearchCardProps) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

  const [location, setLocation] = useState(initialLocation)
  const [checkIn, setCheckIn] = useState(initialCheckIn || today)
  const [checkOut, setCheckOut] = useState(initialCheckOut || inThreeDays)
  const [guests, setGuests] = useState(initialGuests)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const locationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const suggestions = location.trim()
    ? mockCities.filter(
        (c) =>
          c.name.toLowerCase().includes(location.toLowerCase()) ||
          c.country.toLowerCase().includes(location.toLowerCase()),
      )
    : mockCities

  // day after check-in — check-out cannot be earlier
  const minCheckOut = checkIn
    ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().slice(0, 10)
    : inThreeDays

  const handleCheckInChange = (val: string) => {
    setCheckIn(val)
    // auto-advance check-out if it would be on or before the new check-in
    if (val && checkOut <= val) {
      setCheckOut(new Date(new Date(val).getTime() + 86400000).toISOString().slice(0, 10))
    }
  }

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    const qs = new URLSearchParams({ checkIn, checkOut, guestCount: String(guests) })
    if (location.trim()) qs.set('location', location.trim())
    router.push(`/search?${qs}`)
  }

  const fieldBase =
    'flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100'

  return (
    <form
      onSubmit={handleSearch}
      className={cn(
        'w-full rounded-3xl p-2 sm:p-3 shadow-2xl ring-1',
        dark ? 'bg-white/95 backdrop-blur ring-white/30' : 'bg-white ring-slate-200',
      )}
    >
      <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-5">
        {/* Destination with city autocomplete */}
        <div className="relative md:col-span-2" ref={locationRef}>
          <label className={cn(fieldBase, 'w-full cursor-text')}>
            <MapPinIcon className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Destination</div>
              <input
                value={location}
                onChange={(e) => { setLocation(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="City, region, or hotel"
                className="w-full outline-none text-sm font-medium placeholder:text-slate-400 bg-transparent"
                autoComplete="off"
              />
            </div>
          </label>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
              <div className="px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                Popular destinations
              </div>
              {suggestions.map((city) => (
                <button
                  key={city.hotelId}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setLocation(city.name)
                    setShowSuggestions(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <MapPinIcon className="w-4 h-4 text-indigo-500" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{city.name}</div>
                    <div className="text-xs text-slate-500">{city.country}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Check-in */}
        <label className={fieldBase}>
          <CalIcon className="w-5 h-5 text-indigo-600 shrink-0" />
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Check-in</div>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => handleCheckInChange(e.target.value)}
              className="w-full outline-none text-sm font-medium bg-transparent"
            />
          </div>
        </label>

        {/* Check-out */}
        <label className={fieldBase}>
          <CalIcon className="w-5 h-5 text-indigo-600 shrink-0" />
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Check-out</div>
            <input
              type="date"
              value={checkOut}
              min={minCheckOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full outline-none text-sm font-medium bg-transparent"
            />
          </div>
        </label>

        {/* Guests */}
        <div className={fieldBase}>
          <UsersIcon className="w-5 h-5 text-indigo-600 shrink-0" />
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Guests</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{guests} {guests === 1 ? 'guest' : 'guests'}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  className="w-7 h-7 rounded-full border border-slate-200 grid place-items-center text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition"
                >
                  <MinusIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setGuests((g) => g + 1)}
                  className="w-7 h-7 rounded-full border border-slate-200 grid place-items-center text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="mt-2 sm:mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
      >
        <SearchIcon className="w-5 h-5" /> Search Hotels
      </button>
    </form>
  )
}
