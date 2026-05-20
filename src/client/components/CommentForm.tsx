'use client'

import { useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { CommentResponse, CreateCommentRequest, CategoryRatings } from '@/lib/types'

interface Props {
  hotelId: string
  token: string
  onSubmitted: (comment: CommentResponse) => void
}

const StarIcon = ({ filled, onClick }: { filled: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="focus:outline-none">
    <svg viewBox="0 0 24 24" fill="currentColor" className={`w-7 h-7 transition-colors ${filled ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}>
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  </button>
)

const CATEGORIES: { key: keyof CategoryRatings; label: string }[] = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'staff', label: 'Staff' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'ecoFriendly', label: 'Eco-Friendly' },
]

const today = new Date().toISOString().slice(0, 10)

export function CommentForm({ hotelId, token, onSubmitted }: Props) {
  const [overallRating, setOverallRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [categoryRatings, setCategoryRatings] = useState<CategoryRatings>({
    cleanliness: 3,
    staff: 3,
    facilities: 3,
    ecoFriendly: 3,
  })
  const [travelDate, setTravelDate] = useState(today)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[120px] px-3 py-2.5 text-sm text-slate-700 leading-relaxed focus:outline-none',
      },
    },
  })

  const setCat = useCallback((key: keyof CategoryRatings, value: number) => {
    setCategoryRatings((prev) => ({ ...prev, [key]: value }))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (overallRating === 0) { setError('Please select an overall rating.'); return }
    const text = editor?.getHTML() ?? ''
    const plain = text.replace(/<[^>]*>/g, '').trim()
    if (!plain) { setError('Please write your review.'); return }
    setError('')
    setSubmitting(true)
    try {
      const { createComment } = await import('@/lib/api')
      const payload: CreateCommentRequest = {
        hotelId,
        travelDate: new Date(travelDate).toISOString(),
        overallRating,
        categoryRatings,
        commentText: text,
      }
      const comment = await createComment(payload, token)
      editor?.commands.clearContent()
      setOverallRating(0)
      setCategoryRatings({ cleanliness: 3, staff: 3, facilities: 3, ecoFriendly: 3 })
      setTravelDate(today)
      onSubmitted(comment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-5 space-y-5">
      <h3 className="font-semibold text-slate-900">Write a Review</h3>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Overall rating */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-2">
          Overall Rating
        </label>
        <div
          className="flex gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHovered(n)}
              onClick={() => setOverallRating(n)}
              className="focus:outline-none"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className={`w-8 h-8 transition-colors ${n <= (hovered || overallRating) ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}>
                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Category ratings */}
      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map(({ key, label }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-600">{label}</label>
              <span className="text-xs font-semibold text-slate-900">{categoryRatings[key].toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={categoryRatings[key]}
              onChange={(e) => setCat(key, parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-1.5"
            />
          </div>
        ))}
      </div>

      {/* Travel date */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1">
          Travel Date
        </label>
        <input
          type="date"
          value={travelDate}
          max={today}
          onChange={(e) => setTravelDate(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* WYSIWYG editor */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1">
          Your Review
        </label>

        {/* Toolbar */}
        <div className="flex gap-1 px-2 py-1.5 border border-slate-300 border-b-0 rounded-t-lg bg-slate-50">
          {[
            { label: 'B', title: 'Bold', cmd: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold') },
            { label: 'I', title: 'Italic', cmd: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic') },
          ].map(({ label, title, cmd, active }) => (
            <button
              key={label}
              type="button"
              title={title}
              onMouseDown={(e) => { e.preventDefault(); cmd() }}
              className={`w-7 h-7 text-xs font-bold rounded transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            title="Bullet list"
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run() }}
            className={`w-7 h-7 text-xs rounded transition-colors ${editor?.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            ≡
          </button>
        </div>

        <div className="border border-slate-300 rounded-b-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
          <EditorContent editor={editor} />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}
