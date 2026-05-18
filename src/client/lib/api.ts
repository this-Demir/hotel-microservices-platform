import type {
  SearchParams,
  SearchResultItem,
  RoomDetailResponse,
  BookRoomRequest,
  BookingResponse,
  NotificationResponse,
  ChatResponse,
  PagedResult,
  MockHotel,
  ChatMessage,
} from '@/lib/types'
import { mockHotels, mockNotifications, mockChatHistory } from '@/lib/mock-data'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function allRooms(): SearchResultItem[] {
  return mockHotels.flatMap((h) => h.rooms)
}

export async function searchHotels(
  params: SearchParams,
): Promise<PagedResult<SearchResultItem>> {
  if (!API_URL) {
    await delay(500)
    const location = params.location?.toLowerCase().trim()
    let items = allRooms()
    if (location) {
      items = items.filter(
        (r) =>
          r.location.toLowerCase().includes(location) ||
          r.hotelName.toLowerCase().includes(location),
      )
    }
    if (params.guestCount) {
      items = items.filter((r) => !r.capacity || r.capacity >= params.guestCount)
    }
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const start = (page - 1) * pageSize
    return { items: items.slice(start, start + pageSize), page, pageSize, totalCount: items.length }
  }

  const qs = new URLSearchParams()
  if (params.location) qs.set('location', params.location)
  qs.set('checkIn', params.checkIn)
  qs.set('checkOut', params.checkOut)
  qs.set('guestCount', String(params.guestCount))
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  const res = await fetch(`${API_URL}/api/v1/search?${qs}`)
  if (!res.ok) throw new Error('Failed to search hotels')
  return res.json()
}

export async function getRoomDetail(roomId: string): Promise<RoomDetailResponse> {
  if (!API_URL) {
    await delay(500)
    const room = allRooms().find((r) => r.roomId === roomId)
    if (!room) throw new Error('Room not found')
    return room
  }
  const res = await fetch(`${API_URL}/api/v1/search/${roomId}`)
  if (!res.ok) throw new Error('Failed to get room detail')
  return res.json()
}

export async function getHotelRooms(hotelId: string): Promise<SearchResultItem[]> {
  if (!API_URL) {
    await delay(400)
    const hotel = mockHotels.find((h) => h.id === hotelId)
    return hotel?.rooms ?? []
  }
  const hotel = await getHotelById(hotelId)
  return hotel?.rooms ?? []
}

export async function bookRoom(body: BookRoomRequest, token: string): Promise<BookingResponse> {
  if (!API_URL) {
    await delay(900)
    const room = allRooms().find((r) => r.roomId === body.roomId)
    return {
      reservationId: `RES-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      roomId: body.roomId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      pricePaid: room?.price ?? 0,
    }
  }
  const res = await fetch(`${API_URL}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Booking failed')
  return res.json()
}

export async function getNotifications(
  token: string,
  page = 1,
): Promise<PagedResult<NotificationResponse>> {
  if (!API_URL) {
    await delay(300)
    return {
      items: [...mockNotifications],
      page,
      pageSize: 20,
      totalCount: mockNotifications.length,
    }
  }
  const res = await fetch(`${API_URL}/api/v1/notifications?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to get notifications')
  return res.json()
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  if (!API_URL) {
    await delay(150)
    return
  }
  await fetch(`${API_URL}/api/v1/notifications/${id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getInitialChatHistory(): Promise<ChatMessage[]> {
  if (!API_URL) return [...mockChatHistory]
  return [{ role: 'assistant', content: "Hi! I'm your StayEase travel agent. Tell me where you're headed and I'll find the best options for you." }]
}

export async function getHotelById(hotelId: string): Promise<MockHotel | null> {
  if (!API_URL) {
    await delay(300)
    return mockHotels.find((h) => h.id === hotelId) ?? null
  }
  const res = await fetch(`${API_URL}/api/v1/search/hotel/${hotelId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to get hotel')
  const data = await res.json()
  return { ...data, starRating: data.starRating ?? 0, reviews: data.reviews ?? [] }
}

export async function chatWithAgent(message: string, token: string): Promise<ChatResponse> {
  if (!API_URL) {
    await delay(900)
    const m = message.toLowerCase()
    let reply: string
    if (m.includes('paris')) reply = 'Eiffel Luxury Suites has tower-facing rooms from $250 — want me to check your dates?'
    else if (m.includes('bali') || m.includes('beach')) reply = 'Bali Jungle Retreat is a favourite this season. Garden Villa is $95, pool suite is $180.'
    else if (m.includes('cheap') || m.includes('budget')) reply = 'Bali Jungle Retreat\'s Garden Villa at $95/night is the best value right now.'
    else if (m.includes('book') || m.includes('reserve')) reply = 'I can hold a room for you — just open any hotel and tap Book Now.'
    else if (m.endsWith('?')) reply = 'Good question — looking at a few options. Roughly what dates are you eyeing?'
    else reply = 'Got it. Want me to surface the top-rated options in that area, or filter by price first?'
    return { reply }
  }
  const res = await fetch(`${API_URL}/api/v1/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error('Chat request failed')
  return res.json()
}
