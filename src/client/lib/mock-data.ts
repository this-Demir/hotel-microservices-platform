import type { MockHotel, NotificationResponse, ChatMessage, MockCity } from '@/lib/types'

const img = (slug: string) => `https://picsum.photos/seed/${slug}/1200/800`

const hotelImgs: Record<string, string> = {
  'istanbul-bosphorus-hotel': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
  'paris-eiffel-suites':      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80',
  'bali-jungle-retreat':      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80',
  'manhattan-heights-hotel':  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80',
}
const hotelImg = (slug: string) => hotelImgs[slug] ?? img(slug)

export const mockHotels: MockHotel[] = [
  {
    id: 'h-istanbul',
    name: 'Grand Bosphorus Hotel',
    location: 'Istanbul, Türkiye',
    description:
      'A historic waterfront landmark on the European bank of the Bosphorus. Marble lobbies, rooftop pool with a clear view of the strait, and breakfast that runs until noon.',
    imageUrl: hotelImg('istanbul-bosphorus-hotel'),
    starRating: 4,
    rooms: [
      {
        roomId: 'r-ist-1',
        hotelId: 'h-istanbul',
        hotelName: 'Grand Bosphorus Hotel',
        location: 'Istanbul, Türkiye',
        hotelImageUrl: hotelImg('istanbul-bosphorus-hotel'),
        roomType: 'Deluxe Room',
        price: 120,
        starRating: 4,
        capacity: 2,
        description: 'King bed, marble bath, partial Bosphorus view, 32 m².',
      },
      {
        roomId: 'r-ist-2',
        hotelId: 'h-istanbul',
        hotelName: 'Grand Bosphorus Hotel',
        location: 'Istanbul, Türkiye',
        hotelImageUrl: hotelImg('istanbul-bosphorus-hotel'),
        roomType: 'Bosphorus Suite',
        price: 220,
        starRating: 4,
        capacity: 4,
        description: 'Two-room suite, panoramic strait view, private terrace, 70 m².',
      },
    ],
    reviews: [
      {
        id: 'rv-ist-1',
        userId: 'Mira K.',
        travelDate: '2026-03-14',
        overallRating: 5,
        categoryRatings: { cleanliness: 5, staff: 5, facilities: 4, ecoFriendly: 4 },
        commentText:
          'The view at sunrise was unreal. Staff remembered our names by the second morning. Breakfast spread is enormous.',
      },
      {
        id: 'rv-ist-2',
        userId: 'Daniel R.',
        travelDate: '2026-02-02',
        overallRating: 4,
        categoryRatings: { cleanliness: 4, staff: 5, facilities: 4, ecoFriendly: 3 },
        commentText:
          'Beautiful building, very central. Room was a touch smaller than the photos suggested but immaculate.',
      },
    ],
  },
  {
    id: 'h-paris',
    name: 'Eiffel Luxury Suites',
    location: 'Paris, France',
    description:
      'Hausmann-era building two blocks from the Champ-de-Mars. Floor-to-ceiling windows, herringbone parquet, an honesty bar in the salon.',
    imageUrl: hotelImg('paris-eiffel-suites'),
    starRating: 5,
    rooms: [
      {
        roomId: 'r-par-1',
        hotelId: 'h-paris',
        hotelName: 'Eiffel Luxury Suites',
        location: 'Paris, France',
        hotelImageUrl: hotelImg('paris-eiffel-suites'),
        roomType: 'Classic Room',
        price: 250,
        starRating: 5,
        capacity: 2,
        description: 'Queen bed, Diptyque amenities, courtyard side, 26 m².',
      },
      {
        roomId: 'r-par-2',
        hotelId: 'h-paris',
        hotelName: 'Eiffel Luxury Suites',
        location: 'Paris, France',
        hotelImageUrl: hotelImg('paris-eiffel-suites'),
        roomType: 'Panorama Suite',
        price: 400,
        starRating: 5,
        capacity: 3,
        description: 'Tower-facing windows, separate sitting room, butler service, 58 m².',
      },
    ],
    reviews: [
      {
        id: 'rv-par-1',
        userId: 'Sofia A.',
        travelDate: '2026-04-22',
        overallRating: 5,
        categoryRatings: { cleanliness: 5, staff: 5, facilities: 5, ecoFriendly: 4 },
        commentText:
          'We opened the windows on arrival and just stared at the tower for an hour. Concierge booked a last-minute dinner that ended up being the best meal of our trip.',
      },
      {
        id: 'rv-par-2',
        userId: 'James P.',
        travelDate: '2026-01-09',
        overallRating: 4,
        categoryRatings: { cleanliness: 5, staff: 4, facilities: 4, ecoFriendly: 4 },
        commentText:
          'Stunning building, very quiet rooms. Elevator is tiny but it\'s a Paris classic — part of the charm.',
      },
    ],
  },
  {
    id: 'h-bali',
    name: 'Bali Jungle Retreat',
    location: 'Ubud, Bali',
    description:
      'Treetop villas overlooking the Ayung river gorge. Open-air bathrooms, daily yoga at the pavilion, breakfast brought to your deck on a teak tray.',
    imageUrl: hotelImg('bali-jungle-retreat'),
    starRating: 4,
    rooms: [
      {
        roomId: 'r-bal-1',
        hotelId: 'h-bali',
        hotelName: 'Bali Jungle Retreat',
        location: 'Ubud, Bali',
        hotelImageUrl: hotelImg('bali-jungle-retreat'),
        roomType: 'Garden Villa',
        price: 95,
        starRating: 4,
        capacity: 2,
        description: 'Private bale, outdoor shower, walled tropical garden, 40 m².',
      },
      {
        roomId: 'r-bal-2',
        hotelId: 'h-bali',
        hotelName: 'Bali Jungle Retreat',
        location: 'Ubud, Bali',
        hotelImageUrl: hotelImg('bali-jungle-retreat'),
        roomType: 'Pool Suite',
        price: 180,
        starRating: 4,
        capacity: 4,
        description: 'Private infinity plunge pool, gorge-edge deck, two bedrooms, 95 m².',
      },
    ],
    reviews: [
      {
        id: 'rv-bal-1',
        userId: 'Aisha N.',
        travelDate: '2026-03-30',
        overallRating: 5,
        categoryRatings: { cleanliness: 5, staff: 5, facilities: 4, ecoFriendly: 5 },
        commentText:
          'The sound of the river at night was better than any sleep app. They run a serious composting program — felt great about the stay.',
      },
      {
        id: 'rv-bal-2',
        userId: 'Tom L.',
        travelDate: '2026-02-18',
        overallRating: 4,
        categoryRatings: { cleanliness: 4, staff: 5, facilities: 4, ecoFriendly: 5 },
        commentText:
          'Bring bug spray and an open mind. The villa is genuinely beautiful and the staff are unfailingly kind.',
      },
    ],
  },
  {
    id: 'h-nyc',
    name: 'Manhattan Heights Hotel',
    location: 'New York, USA',
    description:
      'Midtown high-rise with skyline-facing rooms from floor 28 up. Lobby bar pours a serious old-fashioned; gym is open 24 hours.',
    imageUrl: hotelImg('manhattan-heights-hotel'),
    starRating: 4,
    rooms: [
      {
        roomId: 'r-nyc-1',
        hotelId: 'h-nyc',
        hotelName: 'Manhattan Heights Hotel',
        location: 'New York, USA',
        hotelImageUrl: hotelImg('manhattan-heights-hotel'),
        roomType: 'City View Room',
        price: 310,
        starRating: 4,
        capacity: 2,
        description: 'Queen bed, Manhattan-facing window, rainfall shower, 24 m².',
      },
      {
        roomId: 'r-nyc-2',
        hotelId: 'h-nyc',
        hotelName: 'Manhattan Heights Hotel',
        location: 'New York, USA',
        hotelImageUrl: hotelImg('manhattan-heights-hotel'),
        roomType: 'Penthouse',
        price: 580,
        starRating: 4,
        capacity: 6,
        description: 'Two-bedroom corner unit, wrap balcony, kitchenette, 130 m².',
      },
    ],
    reviews: [
      {
        id: 'rv-nyc-1',
        userId: 'Priya S.',
        travelDate: '2026-04-04',
        overallRating: 4,
        categoryRatings: { cleanliness: 4, staff: 4, facilities: 5, ecoFriendly: 3 },
        commentText:
          'Bed was a cloud. Loved walking out into Bryant Park in the morning. Lobby gets busy at 5pm but that\'s Midtown.',
      },
      {
        id: 'rv-nyc-2',
        userId: 'Marc V.',
        travelDate: '2026-01-21',
        overallRating: 5,
        categoryRatings: { cleanliness: 5, staff: 5, facilities: 5, ecoFriendly: 3 },
        commentText:
          'Penthouse balcony at night, with a glass of wine and the skyline in front of you — that\'s the entire pitch.',
      },
    ],
  },
]

export const mockNotifications: NotificationResponse[] = [
  {
    id: 'n1',
    title: 'Price drop on a hotel you viewed',
    body: 'Eiffel Luxury Suites dropped to $212/night for your dates. Tap to re-check.',
    isRead: false,
    createdAt: '2026-05-14T09:21:00Z',
  },
  {
    id: 'n2',
    title: 'Your booking is confirmed',
    body: 'Reservation #RES-1f4b9 at Grand Bosphorus Hotel, Jun 4 – Jun 8. We sent details to your inbox.',
    isRead: false,
    createdAt: '2026-05-13T17:02:00Z',
  },
  {
    id: 'n3',
    title: 'Welcome to StayEase',
    body: 'Sign-in unlocks 15% off member rates on every property. Have a look around.',
    isRead: true,
    createdAt: '2026-05-10T12:00:00Z',
  },
]

export const mockCities: MockCity[] = [
  {
    name: 'Istanbul', country: 'Türkiye', hotelId: 'h-istanbul',
    img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
  },
  {
    name: 'Paris', country: 'France', hotelId: 'h-paris',
    img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  },
  {
    name: 'Bali', country: 'Indonesia', hotelId: 'h-bali',
    img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  },
  {
    name: 'New York', country: 'USA', hotelId: 'h-nyc',
    img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  },
]

export const mockChatHistory: ChatMessage[] = [
  { role: 'assistant', content: 'Hi there! I\'m your StayEase travel agent. Where are you headed?' },
  { role: 'user',      content: 'Looking at a long weekend in Paris in early June.' },
  { role: 'assistant', content: 'Lovely. For two? I can pull mid-range options near the 7th arrondissement.' },
  { role: 'user',      content: 'Yes, two adults — keep it under $300/night if you can.' },
  { role: 'assistant', content: 'Got it. Eiffel Luxury Suites has Classic Rooms at $250 — want me to hold one?' },
]
