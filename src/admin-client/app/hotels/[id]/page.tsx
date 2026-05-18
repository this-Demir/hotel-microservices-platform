'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminShell from '@/components/AdminShell'
import RoomModal from '@/components/RoomModal'
import AvailabilityModal from '@/components/AvailabilityModal'
import { getHotel, getRooms, createRoom, updateRoom, deleteRoom, getAvailability, setAvailability, deleteAvailability } from '@/lib/api'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useAuth } from '@/lib/auth-context'
import type {
  HotelResponse,
  RoomResponse,
  AvailabilityResponse,
  CreateRoomRequest,
  UpdateRoomRequest,
  SetAvailabilityRequest,
} from '@/lib/types'

export default function HotelDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { token } = useAuth()

  const [hotel, setHotel] = useState<HotelResponse | null>(null)
  const [rooms, setRooms] = useState<RoomResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedRoom, setSelectedRoom] = useState<RoomResponse | null>(null)
  const [availability, setAvailabilityList] = useState<AvailabilityResponse[]>([])
  const [availLoading, setAvailLoading] = useState(false)

  const [roomModal, setRoomModal] = useState<RoomResponse | null | false>(false)
  const [availRoom, setAvailRoom] = useState<RoomResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RoomResponse | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteAvailTarget, setDeleteAvailTarget] = useState<AvailabilityResponse | null>(null)
  const [deleteAvailLoading, setDeleteAvailLoading] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    const [hotelData, roomsData] = await Promise.all([
      getHotel(id, token),
      getRooms(id, token),
    ])
    if (!hotelData) { router.replace('/hotels'); return }
    setHotel(hotelData)
    setRooms(roomsData.items)
    setLoading(false)
  }, [id, token, router])

  useEffect(() => { load() }, [load])

  async function handleSelectRoom(room: RoomResponse) {
    if (selectedRoom?.id === room.id) {
      setSelectedRoom(null)
      return
    }
    setSelectedRoom(room)
    setAvailLoading(true)
    const avail = await getAvailability(room.id, token)
    setAvailabilityList(avail)
    setAvailLoading(false)
  }

  async function handleSaveRoom(data: CreateRoomRequest) {
    if (roomModal) {
      await updateRoom((roomModal as RoomResponse).id, data as UpdateRoomRequest, token)
      showToast('Room updated')
    } else {
      await createRoom(data, token)
      showToast('Room added')
    }
    setRoomModal(false)
    await load()
  }

  async function handleDeleteRoom() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    const result = await deleteRoom(deleteTarget.id, token)
    setDeleteLoading(false)
    if (result.error) {
      showToast(result.error)
      setDeleteTarget(null)
      return
    }
    if (selectedRoom?.id === deleteTarget.id) setSelectedRoom(null)
    setDeleteTarget(null)
    showToast('Room deleted')
    await load()
  }

  async function handleDeleteAvailability() {
    if (!deleteAvailTarget) return
    setDeleteAvailLoading(true)
    const result = await deleteAvailability(deleteAvailTarget.id, token)
    setDeleteAvailLoading(false)
    if (result.error) {
      showToast(result.error)
      setDeleteAvailTarget(null)
      return
    }
    setDeleteAvailTarget(null)
    showToast('Availability deleted')
    if (selectedRoom) {
      setAvailLoading(true)
      const avail = await getAvailability(selectedRoom.id, token)
      setAvailabilityList(avail)
      setAvailLoading(false)
    }
  }

  async function handleSetAvailability(data: SetAvailabilityRequest) {
    await setAvailability(data, token)
    showToast('Availability saved')
    setAvailRoom(null)
    if (selectedRoom) {
      setAvailLoading(true)
      const avail = await getAvailability(selectedRoom.id, token)
      setAvailabilityList(avail)
      setAvailLoading(false)
    }
  }

  if (loading || !hotel) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="p-8 space-y-8">
        {/* Hotel header */}
        <div>
          <button
            onClick={() => router.push('/hotels')}
            className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center gap-1 transition-colors"
          >
            ← Hotels
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{hotel.name}</h1>
              <p className="text-xs text-gray-400 font-mono mt-1">{hotel.locationPoint}</p>
              {hotel.description && (
                <p className="text-sm text-gray-600 mt-2 max-w-xl">{hotel.description}</p>
              )}
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full shrink-0 ml-4">
              {hotel.adminEmail}
            </span>
          </div>
        </div>

        {/* Rooms section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">
              Rooms{' '}
              <span className="text-gray-400 font-normal text-sm">({rooms.length})</span>
            </h2>
            <button
              onClick={() => setRoomModal(null)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              + Add Room
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-14 text-gray-400">
              <p className="font-medium">No rooms yet</p>
              <p className="text-sm mt-1">Add the first room to this hotel.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Room Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Base Price</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room, i) => (
                    <tr
                      key={room.id}
                      className={`hover:bg-gray-50 transition-colors ${i < rooms.length - 1 || selectedRoom?.id === room.id ? 'border-b border-gray-100' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{room.roomType}</td>
                      <td className="px-4 py-3 text-gray-600">
                        ${room.basePrice.toLocaleString()}
                        <span className="text-gray-400">/night</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setRoomModal(room)}
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { setAvailRoom(room) }}
                            className="px-3 py-1.5 text-xs rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors font-medium"
                          >
                            Set Availability
                          </button>
                          <button
                            onClick={() => handleSelectRoom(room)}
                            className={`px-3 py-1.5 text-xs rounded-md border transition-colors font-medium ${
                              selectedRoom?.id === room.id
                                ? 'bg-gray-200 border-gray-300 text-gray-800'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {selectedRoom?.id === room.id ? 'Hide' : 'View'} Availability
                          </button>
                          <button
                            onClick={() => setDeleteTarget(room)}
                            className="px-3 py-1.5 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Availability panel */}
        {selectedRoom && (
          <div className="bg-white rounded-xl border border-indigo-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Availability</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedRoom.roomType}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAvailRoom(selectedRoom)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  + Set Availability
                </button>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="px-5 py-4">
              {availLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Loading…
                </div>
              ) : availability.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">
                  No availability set. Use &ldquo;Set Availability&rdquo; to add date ranges.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6">Start Date</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6">End Date</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6">Status</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6">Capacity</th>
                      <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide pr-6">Reserved</th>
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {availability.map((a) => (
                      <tr key={a.id} className="border-t border-gray-100">
                        <td className="py-2.5 pr-6 text-gray-700 font-mono text-xs">{a.startDate}</td>
                        <td className="py-2.5 pr-6 text-gray-700 font-mono text-xs">{a.endDate}</td>
                        <td className="py-2.5 pr-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              a.isVacant
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {a.isVacant ? 'Vacant' : 'Full'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-6 text-gray-700">{a.totalCapacity}</td>
                        <td className="py-2.5 pr-6">
                          <span
                            className={
                              a.reservedCount >= a.totalCapacity
                                ? 'text-red-600 font-semibold'
                                : 'text-gray-700'
                            }
                          >
                            {a.reservedCount}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setDeleteAvailTarget(a)}
                            className="px-2.5 py-1 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {roomModal !== false && (
        <RoomModal
          hotelId={id}
          room={roomModal ?? undefined}
          onSave={handleSaveRoom}
          onClose={() => setRoomModal(false)}
        />
      )}

      {availRoom && (
        <AvailabilityModal
          roomId={availRoom.id}
          roomType={availRoom.roomType}
          onSave={handleSetAvailability}
          onClose={() => setAvailRoom(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Room"
          message={`Delete "${deleteTarget.roomType}"? This cannot be undone.`}
          loading={deleteLoading}
          onConfirm={handleDeleteRoom}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteAvailTarget && (
        <ConfirmDialog
          title="Delete Availability"
          message={`Delete availability ${deleteAvailTarget.startDate} → ${deleteAvailTarget.endDate}? This cannot be undone.`}
          loading={deleteAvailLoading}
          onConfirm={handleDeleteAvailability}
          onCancel={() => setDeleteAvailTarget(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </AdminShell>
  )
}
