import type {
  HotelResponse,
  CreateHotelRequest,
  UpdateHotelRequest,
  HotelImageResponse,
  RoomResponse,
  CreateRoomRequest,
  UpdateRoomRequest,
  AvailabilityResponse,
  SetAvailabilityRequest,
  PagedResult,
} from './types'
import { mockHotels, mockRooms, mockAvailability } from './mock-data'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Hotels ──────────────────────────────────────────────────────────────────

export async function getHotels(
  page = 1,
  pageSize = 10,
  token?: string,
): Promise<PagedResult<HotelResponse>> {
  if (!API_URL) {
    await delay(300)
    const start = (page - 1) * pageSize
    return {
      items: mockHotels.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount: mockHotels.length,
    }
  }
  const res = await fetch(
    `${API_URL}/api/v1/admin/hotels?page=${page}&pageSize=${pageSize}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error('Failed to fetch hotels')
  return res.json()
}

export async function getHotel(id: string, token?: string): Promise<HotelResponse | null> {
  if (!API_URL) {
    await delay(200)
    return mockHotels.find((h) => h.id === id) ?? null
  }
  const res = await fetch(`${API_URL}/api/v1/admin/hotels/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch hotel')
  return res.json()
}

export async function createHotel(
  data: CreateHotelRequest,
  token?: string,
): Promise<HotelResponse> {
  if (!API_URL) {
    await delay(400)
    const hotel: HotelResponse = { id: uuid(), ...data, imageUrl: null, latitude: data.latitude ?? null, longitude: data.longitude ?? null }
    mockHotels.push(hotel)
    return hotel
  }
  const res = await fetch(`${API_URL}/api/v1/admin/hotels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create hotel')
  return res.json()
}

export async function updateHotel(
  id: string,
  data: UpdateHotelRequest,
  token?: string,
): Promise<HotelResponse | null> {
  if (!API_URL) {
    await delay(400)
    const idx = mockHotels.findIndex((h) => h.id === id)
    if (idx === -1) return null
    mockHotels[idx] = { ...mockHotels[idx], ...data }
    return mockHotels[idx]
  }
  const res = await fetch(`${API_URL}/api/v1/admin/hotels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to update hotel')
  return res.json()
}

export async function deleteHotel(id: string, token?: string): Promise<boolean> {
  if (!API_URL) {
    await delay(300)
    const idx = mockHotels.findIndex((h) => h.id === id)
    if (idx === -1) return false
    mockHotels.splice(idx, 1)
    return true
  }
  const res = await fetch(`${API_URL}/api/v1/admin/hotels/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.status === 204
}

// ── Hotel Images ─────────────────────────────────────────────────────────────

export async function getHotelImages(hotelId: string, token?: string): Promise<HotelImageResponse[]> {
  if (!API_URL) return []
  const res = await fetch(`${API_URL}/api/v1/admin/hotels/${hotelId}/images`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch images')
  return res.json()
}

export async function uploadHotelImage(
  hotelId: string,
  title: string,
  file: File,
  token?: string,
): Promise<HotelImageResponse> {
  if (!API_URL) throw new Error('No API URL configured')
  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
  const res = await fetch(`${API_URL}/api/v1/admin/hotels/${hotelId}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, fileBase64, contentType: file.type }),
  })
  if (!res.ok) throw new Error('Image upload failed')
  return res.json()
}

export async function deleteHotelImage(hotelId: string, imageId: string, token?: string): Promise<void> {
  if (!API_URL) return
  const res = await fetch(`${API_URL}/api/v1/admin/hotels/${hotelId}/images/${imageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete image')
}

// ── Rooms ────────────────────────────────────────────────────────────────────

export async function getRooms(
  hotelId: string,
  token?: string,
): Promise<PagedResult<RoomResponse>> {
  if (!API_URL) {
    await delay(300)
    const items = mockRooms.filter((r) => r.hotelId === hotelId)
    return { items, page: 1, pageSize: 100, totalCount: items.length }
  }
  const res = await fetch(
    `${API_URL}/api/v1/admin/rooms?hotelId=${hotelId}&pageSize=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error('Failed to fetch rooms')
  return res.json()
}

export async function createRoom(
  data: CreateRoomRequest,
  token?: string,
): Promise<RoomResponse> {
  if (!API_URL) {
    await delay(400)
    const room: RoomResponse = { id: uuid(), ...data }
    mockRooms.push(room)
    return room
  }
  const res = await fetch(`${API_URL}/api/v1/admin/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create room')
  return res.json()
}

export async function updateRoom(
  id: string,
  data: UpdateRoomRequest,
  token?: string,
): Promise<RoomResponse | null> {
  if (!API_URL) {
    await delay(400)
    const idx = mockRooms.findIndex((r) => r.id === id)
    if (idx === -1) return null
    mockRooms[idx] = { ...mockRooms[idx], ...data }
    return mockRooms[idx]
  }
  const res = await fetch(`${API_URL}/api/v1/admin/rooms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to update room')
  return res.json()
}

export async function deleteRoom(id: string, token?: string): Promise<{ error?: string }> {
  if (!API_URL) {
    await delay(300)
    const idx = mockRooms.findIndex((r) => r.id === id)
    if (idx !== -1) mockRooms.splice(idx, 1)
    return {}
  }
  const res = await fetch(`${API_URL}/api/v1/admin/rooms/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 409) return res.json()
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete room')
  return {}
}

// ── Availability ─────────────────────────────────────────────────────────────

export async function getAvailability(
  roomId: string,
  token?: string,
): Promise<AvailabilityResponse[]> {
  if (!API_URL) {
    await delay(300)
    return mockAvailability.filter((a) => a.roomId === roomId)
  }
  const res = await fetch(`${API_URL}/api/v1/admin/availability?roomId=${roomId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch availability')
  return res.json()
}

export async function deleteAvailability(id: string, token?: string): Promise<{ error?: string }> {
  if (!API_URL) {
    await delay(300)
    const idx = mockAvailability.findIndex((a) => a.id === id)
    if (idx !== -1) mockAvailability.splice(idx, 1)
    return {}
  }
  const res = await fetch(`${API_URL}/api/v1/admin/availability/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 409) return res.json()
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete availability')
  return {}
}

export async function setAvailability(
  data: SetAvailabilityRequest,
  token?: string,
): Promise<AvailabilityResponse> {
  if (!API_URL) {
    await delay(400)
    const idx = mockAvailability.findIndex(
      (a) => a.roomId === data.roomId && a.startDate === data.startDate,
    )
    const record: AvailabilityResponse = {
      id: idx >= 0 ? mockAvailability[idx].id : uuid(),
      reservedCount: idx >= 0 ? mockAvailability[idx].reservedCount : 0,
      ...data,
    }
    if (idx >= 0) {
      mockAvailability[idx] = record
    } else {
      mockAvailability.push(record)
    }
    return record
  }
  const res = await fetch(`${API_URL}/api/v1/admin/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to set availability')
  return res.json()
}
