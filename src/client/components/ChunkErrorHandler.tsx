'use client'

import { useEffect } from 'react'

export function ChunkErrorHandler() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const msg = event.message ?? ''
      const src = event.filename ?? ''
      if (
        event.error?.name === 'ChunkLoadError' ||
        msg.includes('dynamically imported module') ||
        msg.includes('Loading chunk') ||
        (msg.includes('Failed to fetch') && src.includes('_next/static'))
      ) {
        window.location.reload()
      }
    }
    window.addEventListener('error', handler)
    return () => window.removeEventListener('error', handler)
  }, [])

  return null
}
