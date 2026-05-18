export interface HotelResponse {
  id: string
  name: string
  locationPoint: string
  description: string
  adminEmail: string
  imageUrl: string | null
}

export interface CreateHotelRequest {
  name: string
  locationPoint: string
  description: string
  adminEmail: string
}

export type UpdateHotelRequest = CreateHotelRequest

export interface RoomResponse {
  id: string
  hotelId: string
  roomType: string
  basePrice: number
}

export interface CreateRoomRequest {
  hotelId: string
  roomType: string
  basePrice: number
}

export interface UpdateRoomRequest {
  roomType: string
  basePrice: number
}

export interface AvailabilityResponse {
  id: string
  roomId: string
  startDate: string
  endDate: string
  isVacant: boolean
  totalCapacity: number
  reservedCount: number
}

export interface SetAvailabilityRequest {
  roomId: string
  startDate: string
  endDate: string
  isVacant: boolean
  totalCapacity: number
}

export interface HotelImageResponse {
  id: string
  hotelId: string
  title: string
  imageUrl: string
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}
