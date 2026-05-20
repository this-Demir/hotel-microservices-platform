import type { SearchResultItem } from '@/lib/types'

function cn(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(' ')
}

function fmtPrice(n: number) {
  return '$' + n.toLocaleString('en-US')
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

interface HotelCardProps {
  item: SearchResultItem
  isLoggedIn?: boolean
  onView: () => void
}

export function HotelCard({ item, isLoggedIn, onView }: HotelCardProps) {
  const stars = item.starRating ?? 4
  const imageUrl = item.hotelImageUrl ?? `https://picsum.photos/seed/${item.hotelId}/1200/800`
  const discounted = Math.round(item.price * 0.85)

  return (
    <article
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden cursor-pointer ring-1 ring-slate-200/70"
      onClick={onView}
    >
      <div className="grid sm:grid-cols-[280px_1fr]">
        {/* Image */}
        <div className="relative h-52 sm:h-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
          {isLoggedIn && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold tracking-wide shadow-md">
              15% MEMBER OFF
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 leading-tight">{item.hotelName}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                  <MapPinIcon className="w-3.5 h-3.5" /> {item.location}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} className={cn('w-4 h-4', i < stars ? 'text-amber-400' : 'text-slate-200')} />
                ))}
              </div>
            </div>

            {item.description && (
              <p className="text-sm text-slate-600 mt-3 line-clamp-2">{item.description}</p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              {['Free WiFi', 'Breakfast', 'Pool', '24h Front Desk'].map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{t}</span>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="text-sm">
              <div className="text-slate-500">{item.roomType}</div>
              <div className="text-slate-900 font-semibold">starting from</div>
            </div>
            <div className="flex items-center gap-4">
              {/* Price */}
              {isLoggedIn ? (
                <div className="text-right">
                  <div className="text-slate-400 line-through font-medium text-sm">{fmtPrice(item.price)}</div>
                  <div className="font-extrabold text-emerald-600 text-2xl">{fmtPrice(discounted)}</div>
                  <div className="text-slate-500 text-sm">per night · member rate</div>
                </div>
              ) : (
                <div className="text-right">
                  <div className="font-extrabold text-slate-900 text-2xl">{fmtPrice(item.price)}</div>
                  <div className="text-slate-500 text-sm">per night</div>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onView() }}
                className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
