# hotel-service

Core service. Handles hotel/room admin, search with caching and discount logic, booking with concurrency safety, and in-app notifications.

---

## Responsibility

- Admin CRUD for hotels, rooms, and room availability
- Hotel search — filter by destination, dates, guest count; apply 15% discount for authenticated users; cache results in Redis
- Booking — `SELECT FOR UPDATE` transaction, capacity decrement, RabbitMQ publish
- In-app notifications — read/mark-as-read for the `Notifications` table

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/admin/hotels` | Yes | List hotels (paginated) |
| GET | `/api/v1/admin/hotels/{id}` | Yes | Get hotel by ID |
| POST | `/api/v1/admin/hotels` | Yes | Create hotel |
| PUT | `/api/v1/admin/hotels/{id}` | Yes | Update hotel |
| DELETE | `/api/v1/admin/hotels/{id}` | Yes | Delete hotel |
| POST | `/api/v1/admin/rooms` | Yes | Add room to hotel |
| POST | `/api/v1/admin/availability` | Yes | Set room availability window |
| GET | `/api/v1/search` | Optional | Search rooms (JWT present → 15% discount) |
| POST | `/api/v1/bookings` | Yes | Book a room |
| GET | `/api/v1/notifications` | Yes | Get in-app notifications (paginated) |
| PATCH | `/api/v1/notifications/{id}/read` | Yes | Mark notification as read |

---

## Data

All data in Supabase (PostgreSQL). Tables: `Hotels`, `Rooms`, `RoomAvailability`, `Reservations`, `Notifications`.
Full schema in `/docs/4_Data_Models.md`.

---

## Key Business Rules

- **Search**: only `IsVacant = true` rows matching destination/dates/guest count are returned. If a valid JWT is present, `BasePrice × 0.85`.
- **Booking**: `BEGIN` → `SELECT … FOR UPDATE` on `RoomAvailability` → increment `ReservedCount` → if `ReservedCount >= TotalCapacity` set `IsVacant = false` → `INSERT Reservation` → `COMMIT` → publish `BookingEvent` to RabbitMQ queue `booking.events`.
- **Redis cache**: hotel detail responses cached by hotel ID. Invalidated on hotel update/delete.

---

## Dependencies

| Dependency | Purpose |
|---|---|
| Supabase PostgreSQL | Primary data store |
| Upstash Redis | Hotel detail cache (`IConnectionMultiplexer`) |
| CloudAMQP RabbitMQ | Publish `BookingEvent` after confirmed booking |
| AWS Cognito JWKS | JWT validated at gateway; service reads `sub` claim from forwarded header |

---

## Configuration

| Key | Notes |
|---|---|
| `ConnectionStrings:Postgres` | Supabase connection string |
| `ConnectionStrings:Redis` | Upstash Redis URL |
| `ConnectionStrings:RabbitMQ` | CloudAMQP AMQP URL |
| `Cognito:Authority` | Cognito user pool URL |

---

## Implementation Plan

1. **Done** — Models, DTOs, `HotelDbContext`, 4 thin controllers, 4 service interfaces
2. **Done** — DI wired in `Program.cs` (Npgsql, Redis, RabbitMQ, JWT)
3. **Next** — `HotelAdminService`: implement CRUD against `HotelDbContext`
4. **Next** — `SearchService`: EF query with date/guest filter + Redis cache-aside + 15% discount
5. **Next** — `BookingService`: raw SQL `SELECT FOR UPDATE` via `DbContext.Database.ExecuteSqlRawAsync`, capacity decrement, RabbitMQ publish
6. **Next** — `NotificationService`: query/update `Notifications` table
7. **Next** — EF Core migrations (`dotnet ef migrations add Init`)
8. **Pending** — Integration test: concurrent booking requests must not overbook
