'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Chunk load failures after a new deployment — reload to pick up fresh chunks
    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch')
    ) {
      window.location.reload()
    }
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/70 p-8 max-w-md w-full text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
        <p className="text-sm text-slate-500">This can happen after a site update. Try refreshing.</p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
