# Implementation TODO — Prioritized

Last updated: 18.05.2026  
Legend: ✅ Done | ⏳ Pending | 🔜 Next session

---

## PHASE 1 — Complete Missing Functionality

Everything in this phase must be done before the system is considered feature-complete.

---

### 1.1 Room Delete (backend + frontend) ✅

**Backend**  
File: `src/hotel-service/Services/HotelAdminService.cs`
```csharp
public async Task<bool> DeleteRoomAsync(Guid roomId)
{
    var hasReservations = await _db.Reservations.AnyAsync(r => r.RoomId == roomId);
    if (hasReservations) throw new InvalidOperationException("Room has active reservations.");
    var room = await _db.Rooms.FindAsync(roomId);
    if (room is null) return false;
    _db.Rooms.Remove(room);
    await _db.SaveChangesAsync();
    return true;
}
```
File: `src/hotel-service/Controllers/AdminController.cs`
```csharp
[HttpDelete("rooms/{id:guid}")]
public async Task<IActionResult> DeleteRoom(Guid id)
{
    try { var deleted = await _adminService.DeleteRoomAsync(id); return deleted ? NoContent() : NotFound(); }
    catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
}
```

**Frontend**  
File: `src/admin-client/lib/api.ts` — `deleteRoom(id, token)` added.  
File: `src/admin-client/app/hotels/[id]/page.tsx` — delete button with confirm dialog.

---

### 1.2 Room Update / Edit (backend + frontend) ✅

**Backend**  
File: `src/hotel-service/Services/HotelAdminService.cs` — `UpdateRoomAsync(roomId, dto)` implemented.  
File: `src/hotel-service/Controllers/AdminController.cs` — `PUT /api/v1/admin/rooms/{id}` added.  

**Frontend**  
File: `src/admin-client/app/hotels/[id]/page.tsx` — Edit button with RoomModal pre-filled with current values.

---

### 1.3 Availability Delete (backend + frontend) ✅

**Backend**  
File: `src/hotel-service/Services/HotelAdminService.cs` — `DeleteAvailabilityAsync(availabilityId)` implemented.  
Guard: checks `ReservedCount > 0` before deleting; returns 409 if occupied.  
File: `src/hotel-service/Controllers/AdminController.cs` — `DELETE /api/v1/admin/availability/{id}` added.

**Frontend**  
File: `src/admin-client/app/hotels/[id]/page.tsx` — delete button on availability table rows.

---

### 1.4 Image Upload UI (admin-client) — ✅ UI done / ⏳ BUG-006 upload returns 500

Image gallery with category titles (room-interior, lobby, pool, etc.) is live in admin panel.  
Multi-image upload + delete UI implemented.  
**BUG-006:** Upload returns 500 — likely Ocelot multipart forwarding issue or frontend FormData problem.  
- Files to investigate: `src/api-gateway/ocelot.Production.json`, `src/admin-client/app/hotels/[id]/page.tsx`
- May need explicit multipart route before catch-all in ocelot.Production.json

⏳ **Pending:** Verify `.webp` format accepted — confirm `accept="image/*"` includes webp; test Supabase storage accepts webp uploads.

---

### 1.5 Lambda EventBridge Trigger ✅

Lambda `CapacityCheckerFunction` deployed (dotnet10, 512MB, 60s, us-east-1).  
EventBridge rule `nightly-capacity-check` — `cron(0 1 * * ? *)` (01:00 UTC).  
Test invoke verified: "0 alert(s) sent", 2168ms cold start, CloudWatch logs confirmed.  
GitHub secrets set: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `LAMBDA_EXECUTION_ROLE_ARN`.

---

### 1.6 Notification End-to-End Verification ✅

Flow verified: book → RabbitMQ `booking-events` → notification-service → Resend email (200) + Supabase Notifications row written + in-app panel shows notification.  
Bugs fixed during verification: BUG-004 (crash loop), BUG-009 (queue name mismatch), BUG-010 (JWT sub claim), BUG-011 (access token vs ID token).

---

### 1.7 Admin Reservations View ⏳

Endpoint already exists: `GET /api/v1/bookings/reservations` (hotel-service, `[Authorize]`)

File: `src/admin-client/app/reservations/page.tsx` (new page)
- Table: guest sub, hotel name, room type, check-in, check-out, price paid, status
- Pagination (reuse pattern from hotels page)
- Add "Reservations" link to the admin sidebar in `AdminShell`

---

### 1.8 Cache Invalidation on Hotel/Room/Availability Writes ⏳

Currently Redis cache (5-min TTL) is never invalidated on writes, so after an admin
creates/updates a room or availability, stale results may show for up to 5 minutes.

File: `src/hotel-service/Services/HotelAdminService.cs`
- After `CreateRoomAsync`, `UpdateRoomAsync`, `CreateAvailabilityAsync`, call:
  ```csharp
  await _cache.KeyDeleteAsync("search:*");  // or pattern-based flush
  ```
- Or implement a targeted key strategy: store cache key as `search:{hash(query)}` and
  tag by `hotelId` so only relevant keys are evicted on that hotel's changes.

---

### 1.9 Main Hotel Image in Search Results ⏳

Search result cards currently show no primary image.  
Each hotel has images stored in Supabase Storage (`hotel-images` bucket) with category titles.  
Define a convention: first uploaded image, or image with category `"lobby"` as the primary.

File: `src/hotel-service/Services/SearchService.cs` — include first image URL in search response.  
File: `src/client/components/HotelCard.tsx` — show `<img>` using the returned URL; fallback to placeholder.

---

### 1.10 Admin Notifications Panel ⏳

No bell/drawer in admin-client to show Lambda capacity alerts.  
Lambda inserts notifications with `UserId = AdminEmail` (BUG-007 — should be Cognito `sub`).

Fix BUG-007 first:
- Add `AdminSub` column to `Hotels` model + EF migration
- Auto-fill `AdminSub` from JWT in HotelModal on hotel create
- Update `Function.cs` in cron-jobs to use `AdminSub` as `UserId`

Then add notifications panel:
File: `src/admin-client/components/AdminShell.tsx` — add bell icon + unread badge + slide-out drawer (same pattern as user client `NotificationsPanel`).

---

## PHASE 2 — Input Validation

All validation failures should return `400 Bad Request` with a clear error message.

---

### 2.1 Backend — Validation Attributes on DTOs ⏳

File: `src/hotel-service/DTOs/` (create if not exists, or add attributes to existing request models)

**Hotel create/update:**
```csharp
[Required, MinLength(2), MaxLength(200)] string Name
[Required, MinLength(2)] string Location
[Range(1, 5)] int StarRating
[EmailAddress] string? ContactEmail
```

**Room create/update:**
```csharp
[Required] Guid HotelId
[Required] string RoomType
[Range(0.01, 100000)] decimal BasePrice
[Range(1, 100)] int MaxGuests
```

**Availability create:**
```csharp
[Required] Guid RoomId
[Required] DateTime CheckIn
[Required] DateTime CheckOut   // validated: CheckOut > CheckIn
[Range(1, 1000)] int TotalCapacity
[Range(0, 1000)] int ReservedCount  // validated: ReservedCount <= TotalCapacity
```

**Comments:**
```csharp
[Range(0, 10)] decimal Cleanliness, Staff, Facilities, EcoFriendly
[Required, MinLength(10), MaxLength(2000)] string Content
```

Enable model validation in controllers:
```csharp
if (!ModelState.IsValid) return BadRequest(ModelState);
```
Or use `[ApiController]` (already applied) — this auto-returns 400 on invalid model.

---

### 2.2 Backend — Delete Cascade Checks ⏳

File: `src/hotel-service/Services/HotelAdminService.cs`

- `DeleteHotelAsync`: check no rooms exist for this hotel; return 409 if they do (or cascade-delete rooms+availability together — document the choice). **BUG-005 open.**
- `DeleteRoomAsync`: check no active/future reservations; return 409 if they exist ✅ implemented
- `DeleteAvailabilityAsync`: check no overlapping reservations ✅ implemented

---

### 2.3 Frontend — Form Validation ⏳

**Admin client** (files: `src/admin-client/components/HotelModal.tsx`, `RoomModal.tsx`, `AvailabilityModal.tsx`):
- Required fields highlighted on submit attempt
- Price: reject non-numeric, negative, or zero
- Dates: end date picker disabled for dates ≤ start date
- Capacity: reserved count field max = total capacity field value

**User client** (file: `src/client/components/SearchCard.tsx`):
- Date range: check-out ≥ check-in + 1 day
- Guests: minimum 1
- Destination: minimum 2 characters before submitting

---

## PHASE 3 — Search Algorithm & Performance

---

### 3.1 Location Search Improvement ⏳

Current: `hotel.Location.Contains(query)` — case-sensitive substring, no ranking.

**Target:** case-insensitive, accent-insensitive, ranked by relevance.

File: `src/hotel-service/Services/SearchService.cs`

Option A — EF Core `ILike` (simplest, good for demo):
```csharp
.Where(h => EF.Functions.ILike(h.Location, $"%{query}%"))
```

Option B — PostgreSQL `to_tsvector` full-text (better ranking):
```sql
WHERE to_tsvector('english', location || ' ' || name) @@ plainto_tsquery('english', @query)
```
Add a generated column + GIN index in a new EF Core migration.

For the course demo, Option A is sufficient. Option B is the production-grade approach.

---

### 3.2 Database Indexes ⏳

Add an EF Core migration:
```csharp
migrationBuilder.CreateIndex("IX_RoomAvailabilities_IsVacant_CheckIn_CheckOut",
    "RoomAvailabilities", new[] { "IsVacant", "CheckIn", "CheckOut" });
migrationBuilder.CreateIndex("IX_Rooms_HotelId", "Rooms", "HotelId");
migrationBuilder.CreateIndex("IX_Hotels_Location", "Hotels", "Location");
```

These are critical for search queries that filter by date range + vacancy + hotel.

---

### 3.3 Search Result Ranking ⏳

After fetching results, rank by:
1. Star rating (descending)
2. Base price (ascending if no auth, discounted price if authenticated)
3. Availability count (descending — more open slots first)

This is a pure service-layer change in `SearchService.cs`, no DB changes needed.

---

## PHASE 4 — Backend Polish

---

### 4.1 Notification Consumer — Crash Protection ✅

File: `src/notification-service/Consumers/BookingEventConsumer.cs`

Email failures isolated in try-catch so in-app notification always writes and message is always ACKed. Fixed in Session 9b (BUG-004).

---

### 4.2 AI Agent — End-to-End Verification 🔜

**This is a course requirement. Verify before final demo.**

File: `src/ai-agent-service/Services/AgentService.cs`

Steps:
1. Open user client chat widget — send "find me a hotel in Istanbul"
2. Verify `search_hotels` tool call fires to hotel-service search API
3. Verify results are returned and displayed in chat
4. Send booking intent — verify `book_hotel` tool call creates a reservation
5. Verify JWT is forwarded correctly (no 401 from hotel-service)

Tool error recovery — catch HTTP errors from hotel-service:
```csharp
try { result = await ExecuteToolAsync(toolCall); }
catch (HttpRequestException ex) {
    result = $"{{\"error\": \"Tool execution failed: {ex.Message}\"}}";
}
```

Also: loading indicator while waiting for OpenAI response; chat history cleared on logout.

---

### 4.3 Token Refresh on 401 (User Client) ⏳

File: `src/client/lib/api.ts`

Wrap all authenticated fetch calls:
```ts
async function fetchWithRefresh(url: string, options: RequestInit): Promise<Response> {
  let res = await fetch(url, options)
  if (res.status === 401) {
    const newToken = await refreshToken()  // call auth-context refresh
    if (newToken) {
      options.headers = { ...options.headers, Authorization: `Bearer ${newToken}` }
      res = await fetch(url, options)
    }
  }
  return res
}
```

---

### 4.4 Professional Email Templates ⏳

Both email templates are bare unstyled HTML (`<h2>` + `<p>` tags only).

**Booking confirmation** (`src/notification-service/Services/EmailService.cs`):
- Branded HTML card: logo/banner, styled check-in/out dates, price breakdown, CTA "View Booking" button, footer

**Capacity alert** (`src/notification-service/Services/EmailService.cs` + `src/cron-jobs/Function.cs`):
- Warning color strip, hotel + room details, occupancy bar/percentage, "Open Admin Panel" link

---

### 4.5 Row Level Security (Supabase RLS) ⏳

Currently all Supabase tables are accessible by the service role without restriction.

Tables to add RLS policies:
- `Notifications` — user can only SELECT their own rows (`UserId = auth.uid()`)
- `Reservations` — user can only SELECT their own rows
- Hotels/Rooms/Availability — read-only for anon; admin role for writes

Implementation: Supabase Dashboard → Table Editor → each table → Policies.  
Service role key bypasses RLS — backend uses service role so no changes to .NET code needed for writes.  
Future: consider row-level restrictions for multi-tenant admin scenarios.

---

### 4.6 Repository Layer Refactor ⏳

Move all DB calls from service classes into dedicated repository classes.

Pattern:
```
Services/
  HotelAdminService.cs  → business logic, validation, calls IHotelRepository
  SearchService.cs       → search + cache logic, calls IHotelRepository + IRoomAvailabilityRepository

Repositories/
  IHotelRepository.cs
  HotelRepository.cs     → EF Core queries only, no business logic
  IRoomAvailabilityRepository.cs
  RoomAvailabilityRepository.cs
```

Benefits: testable without EF Core InMemory; cleaner service layer; easier to add validation before DB writes.  
Do this **after** BUG-005 + input validation are fixed — refactor clean code.

---

### 4.7 Custom Typed Exceptions ⏳

Replace `InvalidOperationException` with domain-specific exceptions.

```csharp
// src/hotel-service/Exceptions/
public class RoomNotAvailableException : Exception { ... }
public class HotelNotFoundException : Exception { ... }
public class RoomNotFoundException : Exception { ... }
public class ReservationConflictException : Exception { ... }
```

Map to HTTP status codes in a global exception handler middleware or `IExceptionHandler`.

---

### 4.8 Add CI Tests After Repository Layer ⏳

After repository layer refactor, add:
- Repository integration tests against real Supabase (or test DB)
- Controller-level tests with WebApplicationFactory
- Add test job to CI workflows (hotel-service already has unit tests; extend to integration)

---

## PHASE 5 — Frontend UX Polish

---

### 5.1 Member Discount Display ⏳

File: `src/client/components/HotelCard.tsx` and search results

When user is authenticated:
```tsx
<span className="line-through text-gray-400">${originalPrice}</span>
<span className="text-green-600 font-bold">${discountedPrice}</span>
<span className="text-xs text-green-500">15% member discount</span>
```

The backend already returns the discounted price when a JWT is present. The frontend
just needs to detect `isAuthenticated` and show the "member price" badge.

---

### 5.2 Error Toast Notifications ⏳

Install: `npm install react-hot-toast` (or use existing shadcn/ui `sonner` if available)

File: `src/client/lib/api.ts` — after each failed fetch:
```ts
import toast from 'react-hot-toast'
toast.error('Booking failed. Please try again.')
```

Add `<Toaster />` to `src/client/app/layout.tsx`.

---

### 5.3 Loading States ⏳

File: `src/client/app/search/page.tsx`
- Show skeleton cards while fetching results
- Disable search button during fetch; show spinner

File: `src/client/components/BookingModal.tsx`
- Disable "Confirm Booking" button during POST
- Show "Booking..." text on button

File: `src/admin-client/app/hotels/page.tsx`
- Show skeleton table rows while fetching hotels

---

### 5.4 AI Chat Error Handling ⏳

File: `src/client/components/AIChat.tsx`

If `chatWithAgent()` throws:
```tsx
setMessages(prev => [...prev, {
  role: 'assistant',
  content: 'Sorry, I could not process your request. Please try again.'
}])
```

---

### 5.5 My Bookings Page ⏳

File: `src/client/app/bookings/page.tsx` (new page)

- List user reservations: hotel name, room type, check-in, check-out, price paid, status
- Call `GET /api/v1/bookings/my-reservations` (or use existing reservations endpoint filtered by JWT sub)
- Pagination
- Link from navbar "My Bookings"

---

### 5.6 My Account / Settings Page ⏳

File: `src/client/app/account/page.tsx` (new page)

- Show profile info from Cognito JWT claims: `name`, `email`, `sub`
- Preferences section: notification toggle, preferred currency (display only for demo)
- Link from navbar "Account" or user avatar menu
- Actual functionality: at minimum show real profile data from JWT; save preferences to localStorage

---

### 5.7 All Navbar Buttons Functional ⏳

File: `src/client/components/Header.tsx` (and any nav components)

Currently some navbar links are placeholder hrefs (`#`). Make them route to real pages:
- "My Bookings" → `/bookings`
- "Account" / user avatar → `/account`
- "Sign In" → `/auth/signin`
- "Sign Up" → `/auth/signup`
- Logo → `/`
- Any other placeholder links identified during review

---

### 5.8 Hotel Data Seeding ⏳

Seed realistic hotel data via admin panel or direct SQL for a compelling demo.

Target: 10–20 hotels across 5+ cities (Istanbul, Paris, London, Dubai, New York) with:
- Hotel name, location, star rating (1–5), admin email, description
- 2–4 room types per hotel (Single, Double, Suite, Deluxe)
- Base prices (range: $50–$500/night), max guests
- Availability windows for the next 3 months (reasonable total/reserved counts)
- At least one image per hotel (lobby or room-interior)

Approach: use admin panel UI or write a seed SQL script run via Supabase SQL Editor.

---

### 5.9 Admin Dashboard / Stats Page ⏳

File: `src/admin-client/app/page.tsx` (currently empty or redirect)

Stats to show (all from existing endpoints):
- Total hotels: `GET /api/v1/admin/hotels?pageSize=1` → use `totalCount` header or response
- Total rooms: count from hotel detail pages
- Total reservations: `GET /api/v1/bookings/reservations`
- Recent bookings: last 5 from reservations endpoint

Simple card grid layout, no charting library needed for demo.

---

## PHASE 6 — Final Cleanup & Deliverables

---

### 6.1 docker-compose.yml cleanup ⏳

File: `docker-compose.yml` line 1 — delete `version: "3.9"`. Compose V2 ignores it and prints a warning.

### 6.2 End-to-End Smoke Test ⏳

Verify every user flow works together:

| Flow | Steps | Expected |
|---|---|---|
| Guest search | Open search, pick dates, submit | Results shown, no discount badge |
| Member search | Sign in, same search | Results shown with 15% discount badge |
| Booking | Click book, confirm | Confirmation shown, notification appears |
| Email | Check inbox | Resend email arrived |
| AI chat | Ask "find me a hotel in Paris" | Agent calls search, returns results |
| Admin create | Log in as admin, create hotel + room + availability | Shows in search |
| Admin image | Upload image for hotel | Thumbnail appears in hotel list |
| Nightly cron | Invoke Lambda manually | Capacity alert email received |

### 6.3 Update README ⏳

File: `README.md`

Add sections:
- Live URLs (gateway, user client, admin client)
- Architecture diagram (ASCII or image link)
- Local dev setup (docker-compose + env vars)
- Test commands (`dotnet test`)
- CI/CD overview

### 6.4 Demo Video ⏳

5-minute walkthrough covering:
1. Search as guest vs member (show price difference)
2. Book a room, receive email
3. Admin panel: create hotel/room/availability
4. AI agent chat
5. Nightly Lambda invoke
