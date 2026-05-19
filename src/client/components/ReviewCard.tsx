'use client'

import DOMPurify from 'dompurify'
import type { CommentResponse } from '@/lib/types'

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(id: string) {
  return id.slice(0, 2).toUpperCase()
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

export function ReviewCard({ review }: { review: CommentResponse }) {
  const isHtml = review.commentText.trimStart().startsWith('<')
  const clean = isHtml ? DOMPurify.sanitize(review.commentText) : null

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white text-sm font-bold shrink-0">
          {initials(review.userId)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 text-sm truncate">{review.userId}</div>
          <div className="text-xs text-slate-500">Travelled {fmtDate(review.travelDate)}</div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} className={`w-4 h-4 ${i < review.overallRating ? 'text-amber-400' : 'text-slate-200'}`} />
          ))}
        </div>
      </div>

      {isHtml && clean ? (
        <div
          className="prose prose-sm prose-slate max-w-none mt-3 text-slate-700"
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      ) : (
        <p className="text-sm text-slate-700 mt-3 leading-relaxed">{review.commentText}</p>
      )}

      <div className="grid grid-cols-2 gap-x-5 gap-y-2 mt-4">
        <CategoryBar label="Cleanliness" value={review.categoryRatings.cleanliness} />
        <CategoryBar label="Staff" value={review.categoryRatings.staff} />
        <CategoryBar label="Facilities" value={review.categoryRatings.facilities} />
        <CategoryBar label="Eco-Friendly" value={review.categoryRatings.ecoFriendly} />
      </div>

      {review.adminReply && (
        <div className="mt-4 border-l-2 border-indigo-300 pl-3 bg-indigo-50/60 rounded-r-xl py-2 pr-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-0.5">Hotel Reply</div>
          <p className="text-xs text-slate-700 leading-relaxed">{review.adminReply}</p>
        </div>
      )}
    </div>
  )
}
