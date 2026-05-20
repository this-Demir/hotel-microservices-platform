export interface SearchParams {
  location?: string
  checkIn: string
  checkOut: string
  guestCount: number
  page?: number
  pageSize?: number
}

export interface SearchResultItem {
  roomId: string
  hotelId: string
  hotelName: string
  location: string
  hotelImageUrl: string | null
  roomType: string
  price: number
  latitude?: number | null
  longitude?: number | null
  starRating?: number
  capacity?: number
  description?: string
}

export type RoomDetailResponse = SearchResultItem

export interface BookRoomRequest {
  roomId: string
  checkIn: string
  checkOut: string
  guestCount: number
}

export interface BookingResponse {
  reservationId: string
  roomId: string
  checkIn: string
  checkOut: string
  pricePaid: number
}

export interface ReservationResponse {
  id: string
  roomId: string
  hotelName: string
  roomType: string
  checkIn: string
  checkOut: string
  guestCount: number
  pricePaid: number
}

export interface NotificationResponse {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export interface AgentSearchPayload {
  checkIn: string
  checkOut: string
  guestCount: number
  items: SearchResultItem[]
  totalCount: number
}

export interface ChatResponse {
  reply: string
  structuredType?: 'search_results' | 'review_results'
  structuredData?: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  averageRating?: number
}

export interface CategoryRatings {
  cleanliness: number
  staff: number
  facilities: number
  ecoFriendly: number
}

export interface MockReview {
  id: string
  userId: string
  travelDate: string
  overallRating: number
  categoryRatings: CategoryRatings
  commentText: string
}

export interface CommentResponse {
  id: string
  hotelId: string
  userId: string
  userEmail: string
  travelDate: string
  overallRating: number
  categoryRatings: CategoryRatings
  commentText: string
  adminReply: string | null
  createdAt: string
}

export interface AgentReviewPayload {
  items: CommentResponse[]
  page: number
  pageSize: number
  totalCount: number
  averageRating: number
}

export interface CreateCommentRequest {
  hotelId: string
  travelDate: string
  overallRating: number
  categoryRatings: CategoryRatings
  commentText: string
}

export interface MockHotel {
  id: string
  name: string
  location: string
  description: string
  imageUrl: string
  starRating: number
  rooms: SearchResultItem[]
  reviews: MockReview[]
}

export interface MockCity {
  name: string
  country: string
  hotelId: string
  img: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  structuredType?: 'search_results' | 'review_results'
  structuredData?: AgentSearchPayload
  reviewData?: AgentReviewPayload
}
