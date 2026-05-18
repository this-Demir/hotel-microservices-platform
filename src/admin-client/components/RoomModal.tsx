'use client'

import { useState } from 'react'
import type { CreateRoomRequest, RoomResponse } from '@/lib/types'

const PRESET_TYPES = ['Standard', 'Deluxe', 'Suite', 'Executive', 'Garden Villa', 'Pool Suite', 'Penthouse', 'Studio']

interface Props {
  hotelId: string
  room?: RoomResponse
  onSave: (data: CreateRoomRequest) => Promise<void>
  onClose: () => void
}

function initialType(room?: RoomResponse) {
  if (!room) return ''
  return PRESET_TYPES.includes(room.roomType) ? room.roomType : '__custom'
}

export default function RoomModal({ hotelId, room, onSave, onClose }: Props) {
  const [roomType, setRoomType] = useState(initialType(room))
  const [customType, setCustomType] = useState(room && !PRESET_TYPES.includes(room.roomType) ? room.roomType : '')
  const [basePrice, setBasePrice] = useState(room ? String(room.basePrice) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const effectiveType = roomType === '__custom' ? customType : roomType

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveType.trim()) {
      setError('Select or enter a room type')
      return
    }
    const price = parseFloat(basePrice)
    if (!basePrice || isNaN(price) || price <= 0) {
      setError('Enter a valid price greater than 0')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSave({ hotelId, roomType: effectiveType.trim(), basePrice: price })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{room ? 'Edit Room' : 'Add Room'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Room Type</span>
            <select
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
            >
              <option value="">Select type…</option>
              {PRESET_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="__custom">Custom…</option>
            </select>
          </label>

          {roomType === '__custom' && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Custom Type Name</span>
              <input
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g. Honeymoon Suite"
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Base Price <span className="text-gray-400 font-normal">(USD/night)</span></span>
            <input
              type="number"
              min="1"
              step="0.01"
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="e.g. 199"
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
              {loading ? 'Saving…' : room ? 'Save Changes' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
