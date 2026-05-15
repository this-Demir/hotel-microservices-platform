import type { MockHotel } from '@/lib/types'

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
)

const positions: Record<string, { left: string; top: string }> = {
  'h-istanbul': { left: '57%', top: '36%' },
  'h-paris':    { left: '49%', top: '28%' },
  'h-bali':     { left: '78%', top: '64%' },
  'h-nyc':      { left: '25%', top: '37%' },
}

interface MapPlaceholderProps {
  hotels?: MockHotel[]
  onPick?: (hotel: MockHotel) => void
}

export function MapPlaceholder({ hotels = [], onPick }: MapPlaceholderProps) {
  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl ring-1 ring-slate-200 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 map-grid">
      {/* Continental hint */}
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-30 text-slate-300">
        <path fill="currentColor" d="M10 20 L20 15 L28 20 L34 18 L40 25 L38 32 L30 35 L22 32 L14 30 Z" />
        <path fill="currentColor" d="M44 18 L52 14 L58 18 L62 22 L60 30 L54 34 L46 30 L42 24 Z" />
        <path fill="currentColor" d="M65 24 L72 22 L78 28 L82 36 L76 44 L70 46 L66 38 Z" />
      </svg>

      {hotels.map((h) => {
        const p = positions[h.id]
        if (!p) return null
        return (
          <button
            key={h.id}
            onClick={() => onPick?.(h)}
            className="group absolute -translate-x-1/2 -translate-y-full"
            style={p}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-indigo-600 ring-4 ring-white shadow-lg grid place-items-center text-white group-hover:scale-110 transition">
                <MapPinIcon className="w-4 h-4" />
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition shadow-xl pointer-events-none">
                {h.name}
                <div className="text-[10px] font-normal text-slate-300">{h.location}</div>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-indigo-600" />
            </div>
          </button>
        )
      })}

      <div className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-white/95 backdrop-blur shadow-md text-xs font-medium text-slate-700 ring-1 ring-slate-200">
        🗺️ Map view — live map coming soon
      </div>
      {hotels.length > 0 && (
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-md text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
          {hotels.length} hotels on map
        </div>
      )}
    </div>
  )
}
