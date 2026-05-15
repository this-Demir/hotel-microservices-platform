# Business Requirements & Specifications

## 1. General API Rules
- All business use cases must be exposed as RESTful web services.
- All REST services must support versioning and pagination.

## 2. Hotel Admin Service (Authenticated)
- Admins can add or update hotel rooms.
- Admins define room availability (Start Date, End Date, Room Type, Capacity).
- Admins mark rooms as "Vacant" or "Occupied" manually.

## 3. Hotel Search Service
- Clients can search for hotels by destination, dates, and number of guests.
- **Rule:** Only rooms explicitly marked as `IsVacant = true` for the specified dates will appear in results.
- **Rule:** Clients who are logged in (valid Cognito JWT present) must see prices with a 15% discount applied server-side.
- **Requirement:** Search results must include a "Show on map" feature.
- **Performance:** Hotel details must be cached using Redis (Upstash).

## 4. Book Hotel Service
- Users can book a hotel for specific dates.
- **Rule — Concurrency:** The booking endpoint MUST use a PostgreSQL `SELECT FOR UPDATE` lock on the `RoomAvailability` row within a transaction to prevent overbooking under concurrent requests.
- **Rule — Capacity:** `ReservedCount` is decremented inside the same transaction. If `ReservedCount >= TotalCapacity` after decrement, set `IsVacant = false` automatically.
- **Rule — Event:** After the transaction commits successfully, publish a booking event to RabbitMQ.
- **Rule:** No actual financial transaction or payment gateway integration is required.

### Booking Transaction Flow
```
BEGIN transaction
  SELECT * FROM RoomAvailability WHERE Id = @id AND ReservedCount < TotalCapacity FOR UPDATE
  UPDATE RoomAvailability SET ReservedCount = ReservedCount + 1
  IF ReservedCount >= TotalCapacity → SET IsVacant = false
  INSERT INTO Reservations (...)
COMMIT
→ Publish event to RabbitMQ (only on successful commit)
```

## 5. IsVacant Ownership Rules
- **Admin-controlled:** Admin can manually set `IsVacant = true` or `false` at any time.
- **System-controlled:** The booking engine automatically sets `IsVacant = false` when `ReservedCount >= TotalCapacity`.
- System takes precedence during booking. Admin override is respected at all other times.

## 6. Comments Service
- Stores user comments and ratings (Cleanliness, Staff, Facilities, EcoFriendly).
- **Rule:** Must use MongoDB Atlas exclusively — not Supabase.
- UI will display a distribution graph of the ratings per category.

## 7. Notification Service
- **Queue Listener (Task 1):**
  - Consumes booking events from RabbitMQ.
  - Sends a booking confirmation email to the user via **Resend**.
  - Inserts a row into the Supabase `Notifications` table for in-app display.
- **Nightly Job (Task 2):**
  - Triggered by AWS Lambda + EventBridge on a nightly schedule.
  - Checks all hotel capacities for the next month.
  - If any hotel's available capacity is below 20%, sends an alert email to the hotel administrator via **Resend** and inserts a `Notifications` row.

## 8. AI Agent Service
- A chat interface integrated into the main frontend application.
- **Architecture:** Dedicated .NET 8 backend service (`ai-agent-service`). Frontend never calls OpenAI directly.
- **Provider:** OpenAI GPT-4o-mini with function/tool calling.
- **Tools defined:** Search hotels, Book hotel — both call `hotel-service` REST APIs internally.
- **Auth:** The user's Cognito JWT is forwarded from the frontend to `ai-agent-service`, which passes it to `hotel-service` API calls to ensure the 15% discount and booking identity are correct.
- **Real-time messaging (WebSockets/SignalR) is NOT required.** Simple request/response is sufficient.
