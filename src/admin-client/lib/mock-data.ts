import type { HotelResponse, RoomResponse, AvailabilityResponse } from './types'

export const mockHotels: HotelResponse[] = [
  {
    id: 'h1',
    name: 'Eiffel Luxury Suites',
    locationPoint: '48.8584,2.2945',
    description: 'Tower-view property in the heart of Paris with world-class amenities.',
    adminEmail: 'admin@eiffelsuites.com',
    imageUrl: null,
    latitude: 48.8584,
    longitude: 2.2945,
  },
  {
    id: 'h2',
    name: 'Bali Jungle Retreat',
    locationPoint: '-8.4095,115.1889',
    description: 'Serene eco-resort surrounded by tropical forest in Ubud.',
    adminEmail: 'admin@balijungle.com',
    imageUrl: null,
    latitude: -8.4095,
    longitude: 115.1889,
  },
  {
    id: 'h3',
    name: 'NYC SkyLine Hotel',
    locationPoint: '40.7580,-73.9855',
    description: 'Contemporary Manhattan hotel with Central Park views.',
    adminEmail: 'admin@nycsky.com',
    imageUrl: null,
    latitude: 40.7580,
    longitude: -73.9855,
  },
]

export const mockRooms: RoomResponse[] = [
  { id: 'r1', hotelId: 'h1', roomType: 'Deluxe', basePrice: 250 },
  { id: 'r2', hotelId: 'h1', roomType: 'Suite', basePrice: 480 },
  { id: 'r3', hotelId: 'h2', roomType: 'Garden Villa', basePrice: 95 },
  { id: 'r4', hotelId: 'h2', roomType: 'Pool Suite', basePrice: 180 },
  { id: 'r5', hotelId: 'h3', roomType: 'Standard', basePrice: 199 },
  { id: 'r6', hotelId: 'h3', roomType: 'Executive', basePrice: 320 },
]

export const mockAvailability: AvailabilityResponse[] = [
  { id: 'av1', roomId: 'r1', startDate: '2026-06-01', endDate: '2026-06-30', isVacant: true, totalCapacity: 2, reservedCount: 0 },
  { id: 'av2', roomId: 'r2', startDate: '2026-06-01', endDate: '2026-06-30', isVacant: true, totalCapacity: 4, reservedCount: 1 },
  { id: 'av3', roomId: 'r3', startDate: '2026-06-01', endDate: '2026-06-30', isVacant: false, totalCapacity: 3, reservedCount: 3 },
  { id: 'av4', roomId: 'r4', startDate: '2026-06-01', endDate: '2026-08-31', isVacant: true, totalCapacity: 2, reservedCount: 0 },
  { id: 'av5', roomId: 'r5', startDate: '2026-07-01', endDate: '2026-07-31', isVacant: true, totalCapacity: 5, reservedCount: 2 },
]
