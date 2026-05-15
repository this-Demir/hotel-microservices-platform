'use client'

import { useState } from 'react'
import type { SetAvailabilityRequest } from '@/lib/types'

interface Props {
  roomId: string
  roomType: string
  onSave: (data: SetAvailabilityRequest) => Promise<void>
  onClose: () => void
}

export default function AvailabilityModal({ roomId, roomType, onSave, onClose }: Props) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalCapacity, setTotalCapacity] = useState('2')
  const [isVacant, setIsVacant] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate || !endDate) {
      setError('Start and end dates are required')
      return
    }
    if (startDate > endDate) {
      setError('Start date must be on or before end date')
      return
    }
    const capacity = parseInt(totalCapacity)
    if (!capacity || capacity < 1) {
      setError('Capacity must be at least 1')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSave({ roomId, startDate, endDate, isVacant, totalCapacity: capacity })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Set Availability</h2>
            <p className="text-xs text-gray-500 mt-0.5">{roomType}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Start Date</span>
              <input
                type="date"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">End Date</span>
              <input
                type="date"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Total Capacity <span className="text-gray-400 font-normal">(max guests)</span></span>
            <input
              type="number"
              min="1"
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={totalCapacity}
              onChange={(e) => setTotalCapacity(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-indigo-600 rounded"
              checked={isVacant}
              onChange={(e) => setIsVacant(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Mark as <span className="font-medium">Vacant</span> <span className="text-gray-400">(available for booking)</span>
            </span>
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
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
