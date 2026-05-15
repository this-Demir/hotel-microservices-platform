'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminShell from '@/components/AdminShell'
import HotelModal from '@/components/HotelModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getHotels, createHotel, updateHotel, deleteHotel } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { HotelResponse, CreateHotelRequest } from '@/lib/types'

const PAGE_SIZE = 10

export default function HotelsPage() {
  const { token } = useAuth()
  const [hotels, setHotels] = useState<HotelResponse[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // undefined = closed, null = create mode, HotelResponse = edit mode
  const [hotelModal, setHotelModal] = useState<HotelResponse | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<HotelResponse | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getHotels(page, PAGE_SIZE, token)
      setHotels(result.items)
      setTotalCount(result.totalCount)
    } finally {
      setLoading(false)
    }
  }, [page, token])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleSave(data: CreateHotelRequest) {
    if (hotelModal) {
      await updateHotel(hotelModal.id, data, token)
      showToast('Hotel updated')
    } else {
      await createHotel(data, token)
      showToast('Hotel created')
    }
    setHotelModal(undefined)
    await load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    await deleteHotel(deleteTarget.id, token)
    setDeleteTarget(null)
    setDeleteLoading(false)
    showToast('Hotel deleted')
    await load()
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <AdminShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Hotels</h1>
            <p className="text-sm text-gray-400 mt-0.5">{totalCount} total</p>
          </div>
          <button
            onClick={() => setHotelModal(null)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            + New Hotel
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hotels.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="font-medium">No hotels yet</p>
              <p className="text-sm mt-1">Create your first hotel to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Email</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {hotels.map((h, i) => (
                  <tr
                    key={h.id}
                    className={`hover:bg-gray-50 transition-colors ${i < hotels.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{h.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{h.locationPoint}</td>
                    <td className="px-4 py-3 text-gray-500">{h.adminEmail}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/hotels/${h.id}`}
                          className="px-3 py-1.5 text-xs rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
                        >
                          Rooms
                        </Link>
                        <button
                          onClick={() => setHotelModal(h)}
                          className="px-3 py-1.5 text-xs rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(h)}
                          className="px-3 py-1.5 text-xs rounded-md text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 px-1">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {hotelModal !== undefined && (
        <HotelModal
          hotel={hotelModal}
          onSave={handleSave}
          onClose={() => setHotelModal(undefined)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Hotel"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 animate-in">
          {toast}
        </div>
      )}
    </AdminShell>
  )
}
