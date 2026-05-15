import type { SearchResultItem } from '@/lib/types'

function fmtPrice(n: number) {
  return '$' + n.toLocaleString('en-US')
}

const UsersIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

interface RoomCardProps {
  room: SearchResultItem
  isLoggedIn?: boolean
  onBook: (room: SearchResultItem) => void
}

export function RoomCard({ room, isLoggedIn, onBook }: RoomCardProps) {
  const discounted = Math.round(room.price * 0.85)
  const imageUrl = room.hotelImageUrl ?? `https://picsum.photos/seed/${room.hotelId}/1200/800`

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden ring-1 ring-slate-200/70 grid sm:grid-cols-[200px_1fr]">
      <div className="h-40 sm:h-auto bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 text-lg">{room.roomType}</h4>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
            <UsersIcon className="w-4 h-4" /> Sleeps {room.capacity ?? 2}
          </div>
          {room.description && (
            <p className="text-sm text-slate-600 mt-2">{room.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['Free cancellation', 'King bed', 'Breakfast included'].map((t) => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">{t}</span>
            ))}
          </div>
        </div>
        <div className="sm:text-right flex sm:flex-col items-end justify-between gap-3">
          {isLoggedIn ? (
            <div className="text-right">
              <div className="text-slate-400 line-through font-medium text-xs">{fmtPrice(room.price)}</div>
              <div className="font-extrabold text-emerald-600 text-lg">{fmtPrice(discounted)}</div>
              <div className="text-slate-500 text-xs">per night · member rate</div>
            </div>
          ) : (
            <div className="text-right">
              <div className="font-extrabold text-slate-900 text-lg">{fmtPrice(room.price)}</div>
              <div className="text-slate-500 text-xs">per night</div>
            </div>
          )}
          <button
            onClick={() => onBook(room)}
            className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm whitespace-nowrap"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  )
}
