'use client'

import { useState } from 'react'
import type { HotelResponse, CreateHotelRequest } from '@/lib/types'

interface Props {
  hotel?: HotelResponse | null
  onSave: (data: CreateHotelRequest) => Promise<void>
  onClose: () => void
}

export default function HotelModal({ hotel, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    name: hotel?.name ?? '',
    locationPoint: hotel?.locationPoint ?? '',
    description: hotel?.description ?? '',
    adminEmail: hotel?.adminEmail ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.adminEmail.trim()) {
      setError('Hotel name and admin email are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{hotel ? 'Edit Hotel' : 'New Hotel'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Hotel Name</span>
            <input
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Grand Palace Hotel"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Location <span className="text-gray-400 font-normal">(lat,lng)</span></span>
            <input
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              value={form.locationPoint}
              onChange={set('locationPoint')}
              placeholder="48.8584,2.2945"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Brief hotel description…"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Admin Email</span>
            <input
              type="email"
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.adminEmail}
              onChange={set('adminEmail')}
              placeholder="admin@hotel.com"
            />
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'Saving…' : hotel ? 'Save Changes' : 'Create Hotel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
