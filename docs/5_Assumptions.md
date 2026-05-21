# Assumptions

Assumptions made during development that are not explicitly defined by the project specification. All are considered acceptable per the course requirement that assumptions be documented.

---

## 1. Search & Availability

- `LocationPoint` is a plain text field used for keyword search (`LIKE '%Istanbul%'`). It is not parsed as coordinates.
- A room appears in search results only if a `RoomAvailability` record with `IsVacant = true` exists whose `[StartDate, EndDate]` window fully contains the requested `[CheckIn, CheckOut]` range.
- The search `guestCount` parameter filters by `TotalCapacity >= requestedGuests`.
- Hotels without `Latitude`/`Longitude` appear in the search list but are silently excluded from the map view.

---

## 2. Booking & Pricing

- No payment gateway is implemented. A booking is confirmed immediately upon successful database commit.
- The 15% member discount is applied server-side whenever a valid Cognito JWT is present on the search request. Unauthenticated users always see the full price.
- `PricePaid` is captured at booking time to preserve the price independently of any future `BasePrice` changes on the room.
- `SELECT FOR UPDATE` on the `RoomAvailability` row is the sole concurrency guard. Concurrent bookings for the same room and dates are serialized at the database level.
- There is no booking cancellation flow.

---

## 3. IsVacant Dual Control

- `IsVacant` is under dual control: admins can set it manually at any time, and the booking engine automatically sets it to `false` when `ReservedCount >= TotalCapacity`. The admin-set value takes precedence (an admin can mark a room occupied regardless of capacity).

---

## 4. Users & Authentication

- The Cognito `sub` claim is used as the canonical user identifier (`UserId`) across all services and tables.
- JWT validation happens exclusively at the Ocelot API Gateway. Downstream services trust the forwarded `X-User-Sub` and `X-User-Email` headers without re-validating.
- Admin privileges are determined by Cognito User Pool group membership (`admin` group), checked at the gateway.
- External/social logins are not supported.

---

## 5. Hotels & Ownership

- Each hotel is owned by the admin who created it. `AdminSub` is set from the creating admin's JWT `sub` at creation time and is not changed afterward.
- There is no multi-admin ownership — a hotel has exactly one admin owner.
- Hotel coordinates are optional. The admin sets them via a Leaflet map picker in the admin panel; hotels can be created without them.

---

## 6. Comments

- Any authenticated user can post a comment on any hotel. There is no restriction to verified past guests.
- `overallRating` is provided directly by the user; it is not computed from the category ratings.
- The four comment categories (cleanliness, staff, facilities, ecoFriendly) are fixed and defined in the schema.
- Admin replies are optional and can be added after the comment is posted.

---

## 7. Notifications & Lambda

- "Next month" in the nightly capacity check refers to the next calendar month from the Lambda execution date.
- The alert threshold is `(TotalCapacity - ReservedCount) / TotalCapacity < 0.20` (less than 20% capacity remaining).
- The Lambda both sends an email via Resend and inserts a row into the `Notifications` table in the same invocation.
- Hotels without `AdminSub` (created before the migration) receive no capacity alerts.

---

## 8. AI Agent

- The AI agent is stateless — no chat history is persisted between sessions.
- GPT-4o-mini with function calling is used to invoke the hotel-service Search and Book APIs on behalf of the user.
- Responses are synchronous HTTP. Real-time messaging (WebSockets/SignalR) is not implemented.
- The OpenAI API key never leaves `ai-agent-service`. The frontend calls `ai-agent-service`, not OpenAI directly.

---

## 9. Frontend

- There are two separate frontends: `client` (user-facing: search, book, AI chat, comments) and `admin-client` (hotel and room management, notifications).
- Auth state is managed via React context. The Cognito ID token is held in memory and used as the Bearer token for all API calls.
- All Leaflet map components are loaded with `dynamic(..., { ssr: false })` because `react-leaflet` requires `window` and crashes during SSR.
- The search results page is the entry point for the booking flow. Users cannot book without first running a search.
- The AI chat window is embedded on the main search page and shares the user's auth token so the agent can book on their behalf.
- Frontend validation mirrors server-side rules (date ranges, guest count > 0) but the server is always the authority.

---

## 10. CRUD Boundaries

- **Hotels**: admins can create, read, update, and delete. Delete is blocked if the hotel has existing rooms (returns 409).
- **Rooms**: admins can create, read, update, and delete under a hotel.
- **RoomAvailability**: admins can create, read, and update availability windows. There is no hard delete.
- **Reservations**: users can create (book). There is no update or cancellation.
- **Comments**: users can create. Admins can add a reply. Neither can edit or delete a comment after posting.
- **Notifications**: users can read and mark as read. All notifications are system-created (booking confirmation or Lambda alert); users cannot create them directly.
