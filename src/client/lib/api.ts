import type {
  SearchParams,
  SearchResultItem,
  RoomDetailResponse,
  BookRoomRequest,
  BookingResponse,
  ReservationResponse,
  NotificationResponse,
  ChatResponse,
  PagedResult,
  MockHotel,
  ChatMessage,
  CommentResponse,
  CreateCommentRequest,
} from '@/lib/types'
const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function searchHotels(
  params: SearchParams,
): Promise<PagedResult<SearchResultItem>> {
  if (!API_URL) return { items: [], page: params.page ?? 1, pageSize: params.pageSize ?? 20, totalCount: 0 }

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
  if (!API_URL) throw new Error('API not configured')
  const res = await fetch(`${API_URL}/api/v1/search/${roomId}`)
  if (!res.ok) throw new Error('Failed to get room detail')
  return res.json()
}

export async function getHotelRooms(hotelId: string): Promise<SearchResultItem[]> {
  if (!API_URL) return []
  const hotel = await getHotelById(hotelId)
  return hotel?.rooms ?? []
}

export async function bookRoom(body: BookRoomRequest, token: string): Promise<BookingResponse> {
  if (!API_URL) throw new Error('API not configured')
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
  if (!API_URL) return { items: [], page, pageSize: 20, totalCount: 0 }
  const res = await fetch(`${API_URL}/api/v1/notifications?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to get notifications')
  return res.json()
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  if (!API_URL) return
  await fetch(`${API_URL}/api/v1/notifications/${id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getInitialChatHistory(): Promise<ChatMessage[]> {
  return [{ role: 'assistant', content: "Hi! I'm your StayEase travel agent. Tell me where you're headed and I'll find the best options for you." }]
}

export async function getHotelById(hotelId: string): Promise<MockHotel | null> {
  if (!API_URL) return null
  const res = await fetch(`${API_URL}/api/v1/search/hotel/${hotelId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to get hotel')
  const data = await res.json()
  return { ...data, starRating: data.starRating ?? 0, reviews: data.reviews ?? [] }
}

export async function chatWithAgent(message: string, token: string, history: ChatMessage[] = []): Promise<ChatResponse> {
  if (!API_URL) throw new Error('Chat agent is not available without a backend connection.')
  const res = await fetch(`${API_URL}/api/v1/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, history }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? 'Something went wrong. Please try again.')
  }
  return res.json()
}

export async function getReservations(
  token: string,
  page = 1,
  pageSize = 10,
): Promise<PagedResult<ReservationResponse>> {
  if (!API_URL) return { items: [], page, pageSize, totalCount: 0 }
  const res = await fetch(`${API_URL}/api/v1/bookings?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch reservations')
  return res.json()
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function getComments(
  hotelId: string,
  page = 1,
  pageSize = 20,
): Promise<PagedResult<CommentResponse>> {
  if (!API_URL) return { items: [], page, pageSize, totalCount: 0 }
  const res = await fetch(
    `${API_URL}/api/v1/comments/${hotelId}?page=${page}&pageSize=${pageSize}`,
  )
  if (!res.ok) throw new Error('Failed to fetch comments')
  return res.json()
}

export async function createComment(
  data: CreateCommentRequest,
  token: string,
): Promise<CommentResponse> {
  if (!API_URL) throw new Error('No API URL configured')
  const res = await fetch(`${API_URL}/api/v1/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to submit review')
  return res.json()
}
