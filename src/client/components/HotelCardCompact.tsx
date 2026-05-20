'use client'

import type { SearchResultItem, MockHotel } from '@/lib/types'

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
const BookmarkIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

interface Props {
  item: SearchResultItem
  hotel?: MockHotel
  isLoggedIn: boolean
  isHovered: boolean
  isSelected: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onView: () => void
}

export function HotelCardCompact({ item, hotel, isLoggedIn, isHovered, isSelected, onMouseEnter, onMouseLeave, onView }: Props) {
  const memberPrice = Math.round(item.price * 0.85)
  const imageSrc = item.hotelImageUrl ?? `https://picsum.photos/seed/${item.hotelId}/400/300`

  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onView}
      className={cn(
        'group bg-white rounded-2xl overflow-hidden cursor-pointer ring-1 transition-all duration-200',
        isSelected
          ? 'ring-2 ring-indigo-500 shadow-xl -translate-y-0.5'
          : isHovered
            ? 'ring-slate-300 shadow-xl -translate-y-0.5'
            : 'ring-slate-200/70 shadow-md hover:shadow-xl hover:-translate-y-0.5',
      )}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageSrc}
          alt=""
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
        />
        {isLoggedIn && (
          <span className="absolute top-3 left-3 px-2 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold tracking-wide shadow-md">
            15% OFF
          </span>
        )}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 hover:bg-white grid place-items-center text-slate-600 shadow-md transition"
          aria-label="Save"
        >
          <BookmarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-[15px] text-slate-900 leading-tight truncate">{item.hotelName}</h3>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <MapPinIcon className="w-3 h-3 shrink-0" />
              {item.location}
            </div>
          </div>
          {hotel?.starRating != null && (
            <div className="flex items-center gap-1 shrink-0">
              <StarIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-700">{hotel.starRating}.0</span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 mt-2">{item.roomType}</div>

        <div className="mt-2 flex items-baseline justify-between">
          {isLoggedIn ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-emerald-600">${memberPrice}</span>
              <span className="text-xs text-slate-400 line-through">${Math.round(item.price)}</span>
            </div>
          ) : (
            <span className="text-lg font-extrabold text-slate-900">${Math.round(item.price)}</span>
          )}
          <span className="text-[11px] text-slate-500">/ night</span>
        </div>
      </div>
    </article>
  )
}
