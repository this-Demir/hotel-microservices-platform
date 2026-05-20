'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { HotelResponse, CreateHotelRequest } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'

const LocationPicker = dynamic(
  () => import('./LocationPicker').then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 220, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        Loading map…
      </div>
    ),
  },
)

interface Props {
  hotel?: HotelResponse | null
  onSave: (data: CreateHotelRequest) => Promise<void>
  onClose: () => void
}

export default function HotelModal({ hotel, onSave, onClose }: Props) {
  const { adminSub } = useAuth()
  const [form, setForm] = useState({
    name: hotel?.name ?? '',
    locationPoint: hotel?.locationPoint ?? '',
    description: hotel?.description ?? '',
    adminEmail: hotel?.adminEmail ?? '',
  })
  const [lat, setLat] = useState<number | null>(hotel?.latitude ?? null)
  const [lng, setLng] = useState<number | null>(hotel?.longitude ?? null)
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
      await onSave({ ...form, latitude: lat, longitude: lng, adminSub: hotel?.adminSub ?? adminSub })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function handleCoordInput(field: 'lat' | 'lng', value: string) {
    const n = parseFloat(value)
    if (field === 'lat') setLat(isNaN(n) ? null : n)
    else setLng(isNaN(n) ? null : n)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
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
            <span className="text-sm font-medium text-gray-700">Location</span>
            <input
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.locationPoint}
              onChange={set('locationPoint')}
              placeholder="e.g. Istanbul, Turkey"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-gray-700">Map Pin <span className="text-gray-400 font-normal text-xs">— click the map to place</span></span>
            <div className="mt-2">
              <LocationPicker lat={lat} lng={lng} onChange={(la, lo) => { setLat(la); setLng(lo) }} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-gray-500">Latitude</span>
                <input
                  type="number"
                  step="any"
                  className="mt-0.5 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  value={lat ?? ''}
                  onChange={(e) => handleCoordInput('lat', e.target.value)}
                  placeholder="41.0082"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">Longitude</span>
                <input
                  type="number"
                  step="any"
                  className="mt-0.5 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  value={lng ?? ''}
                  onChange={(e) => handleCoordInput('lng', e.target.value)}
                  placeholder="28.9784"
                />
              </label>
            </div>
            {lat != null && lng != null && (
              <p className="text-xs text-gray-400 mt-1">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
            )}
          </div>

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
