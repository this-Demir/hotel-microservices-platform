import type { MockReview } from '@/lib/types'

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
}

const StarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>
)

function CategoryBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-900 font-semibold">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  )
}

interface ReviewCardProps {
  review: MockReview
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white text-sm font-bold shrink-0">
          {initials(review.userId)}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-slate-900 text-sm">{review.userId}</div>
          <div className="text-xs text-slate-500">Travelled {fmtDate(review.travelDate)}</div>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} className={`w-4 h-4 ${i < review.overallRating ? 'text-amber-400' : 'text-slate-200'}`} />
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-700 mt-3 leading-relaxed">{review.commentText}</p>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 mt-4">
        <CategoryBar label="Cleanliness" value={review.categoryRatings.cleanliness} />
        <CategoryBar label="Staff" value={review.categoryRatings.staff} />
        <CategoryBar label="Facilities" value={review.categoryRatings.facilities} />
        <CategoryBar label="Eco-Friendly" value={review.categoryRatings.ecoFriendly} />
      </div>
    </div>
  )
}
