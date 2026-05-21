# Implementation TODO — Prioritized

Last updated: 20.05.2026
Legend: ✅ Done | ⏳ Pending | 🔜 Next session

---

## PHASE 1 — Complete Missing Functionality

---

### 1.1 Room Delete (backend + frontend) ✅
### 1.2 Room Update / Edit (backend + frontend) ✅
### 1.3 Availability Delete (backend + frontend) ✅

### 1.4 Image Upload UI (admin-client) ✅

Image gallery with category titles live in admin panel. Multi-image upload + delete UI implemented.
Upload previously returned 500 (BUG-006) — fixed by reading Supabase error body and creating the `hotel-images` bucket. WebP format accepted via `accept="image/*"`.

---

### 1.5 Lambda EventBridge Trigger ✅

Lambda `CapacityCheckerFunction` deployed (dotnet10, 512MB, 60s, us-east-1).
EventBridge rule `nightly-capacity-check` — `cron(0 1 * * ? *)` (01:00 UTC).
Test invoke verified: "0 alert(s) sent", 2168ms cold start, CloudWatch logs confirmed.

---

### 1.6 Notification End-to-End Verification ✅

Flow verified: book → RabbitMQ `booking-events` → notification-service → Resend email (200) + Supabase Notifications row written + in-app panel shows notification.
Bugs fixed: BUG-004 (crash loop), BUG-009 (queue name mismatch), BUG-010 (JWT sub claim), BUG-011 (access token vs ID token).

---

### 1.7 Admin Reservations View ✅

New endpoint `GET /api/v1/admin/reservations` returns all reservations paginated.
File: `src/hotel-service/Controllers/AdminController.cs` + `HotelAdminService.GetAllReservationsAsync`.
Page: `src/admin-client/app/reservations/page.tsx` — table with hotel, room type, dates, guests, price, derived status (Upcoming/Active/Completed). Pagination matches hotels page pattern.

---

### 1.8 Cache Invalidation on Hotel/Room/Availability Writes ⏳

Currently Redis cache (5-min TTL) is never invalidated on writes.

File: `src/hotel-service/Services/HotelAdminService.cs`
- After `CreateRoomAsync`, `UpdateRoomAsync`, `CreateAvailabilityAsync`, call:
  ```csharp
  await _cache.KeyDeleteAsync("search:*");
  ```

---

### 1.9 Main Hotel Image in Search Results ⏳

Search result cards currently show no primary image.

File: `src/hotel-service/Services/SearchService.cs` — include first image URL in search response.
File: `src/client/components/HotelCard.tsx` — show `<img>` using the returned URL; fallback to placeholder.

---

### 1.10 Admin Notifications Panel ✅

**BUG-007 fixed:** Added `AdminSub` (nullable text) to `Hotels` model + EF migration `AddHotelAdminSub` applied to Supabase. `HotelModal.tsx` auto-fills from JWT `sub` on create; preserves on edit. `Function.cs` uses `AdminSub ?? ""` as `UserId`.

Notifications panel built:
- `src/admin-client/components/AdminNotificationsPanel.tsx` — slide-out drawer, amber alert theme, mark-read (persists to DB — HTTP PUT fixed in `NotificationsController`)
- `src/admin-client/components/AdminShell.tsx` — top bar with bell icon + numeric unread badge; loads notifications on mount

⏳ **Pending:** Full Lambda E2E verify requires DB reseed with hotels that have valid `AdminSub` and `AdminEmail` set.

---

### 1.11 Admin Dashboard ✅

File: `src/admin-client/app/page.tsx` — stat cards (total hotels, total bookings) + recent 5 bookings table. Replaces the old redirect to `/hotels`.

---

## PHASE 2 — Input Validation

---

### 2.1 Backend — Validation Attributes on DTOs ✅

DataAnnotations (`[Required]`, `[Range]`, `[EmailAddress]`, `[MinLength]`/`[MaxLength]`) added to all request DTOs in `hotel-service` and `comments-service` using the `[property: ...]` target syntax for positional records. Cross-field rules (`CheckOut > CheckIn`, `EndDate > StartDate`, empty-Guid rejection) implemented via `IValidatableObject` on `SetAvailabilityRequest`, `SearchRequest`, `BookRoomRequest`, and `CreateCommentRequest`. `[ApiController]` auto-returns 400 ProblemDetails on invalid model state — no controller changes required.

---

### 2.2 Backend — Delete Cascade Checks

- `DeleteHotelAsync`: check no rooms exist → 409 ✅ fixed (BUG-005)
- `DeleteRoomAsync`: check no active/future reservations → 409 ✅ implemented
- `DeleteAvailabilityAsync`: check `ReservedCount > 0` → 409 ✅ implemented

---

### 2.3 Frontend — Form Validation ⏳

**Admin client** (files: `HotelModal.tsx`, `RoomModal.tsx`, `AvailabilityModal.tsx`):
- Required fields highlighted on submit attempt
- Price: reject non-numeric, negative, or zero
- Dates: end date picker disabled for dates ≤ start date

**User client** (file: `src/client/components/SearchCard.tsx`):
- Date range: check-out ≥ check-in + 1 day
- Guests: minimum 1

---

## PHASE 3 — Search Algorithm & Performance

---

### 3.1 Location Search Improvement ⏳

Current: case-sensitive substring match. Target: `EF.Functions.ILike` for case-insensitive.

File: `src/hotel-service/Services/SearchService.cs`
```csharp
.Where(h => EF.Functions.ILike(h.LocationPoint, $"%{query}%"))
```

---

### 3.2 Database Indexes 

```csharp
migrationBuilder.CreateIndex("IX_RoomAvailabilities_IsVacant_StartDate_EndDate",
    "RoomAvailabilities", new[] { "IsVacant", "StartDate", "EndDate" });
migrationBuilder.CreateIndex("IX_Hotels_LocationPoint", "Hotels", "LocationPoint");
```

---

### 3.3 Search Result Ranking ✅

Rank results by: star rating desc → base price asc → availability count desc.
Pure service-layer change in `SearchService.cs`, no DB changes.

---

## PHASE 4 — Backend Polish

---

### 4.1 Notification Consumer — Crash Protection ✅
Email failures isolated in try-catch (BUG-004, Session 9b).

### 4.2 AI Agent — End-to-End Verification ✅

AI agent wired end-to-end. `ChatWidget.tsx` handles `search_hotels` + `book_hotel` tool responses, shows loading indicator (`thinking` state), and catches errors with user-friendly messages. `AiAgentService.cs` enforces search-before-reviews guard.

---

### 4.3 Token Refresh on 401 (User Client) ⏳

File: `src/client/lib/api.ts` — wrap authenticated fetch calls with a refresh-token retry.

---

### 4.4 Professional Email Templates ✅

**Booking confirmation** (`src/notification-service/Services/EmailService.cs`):
- Branded HTML card: check-in/out dates, price breakdown, CTA "View Booking" button, footer

**Capacity alert** (`src/notification-service/Services/EmailService.cs` + `src/cron-jobs/Function.cs`):
- Warning colour strip, hotel + room details, occupancy percentage, "Open Admin Panel" link

---

### 4.5 Row Level Security (Supabase RLS) ✅

Tables to add policies:
- `Notifications` — user can only SELECT their own rows
- `Reservations` — user can only SELECT their own rows

Service role key bypasses RLS — no .NET code changes needed for writes.

---

### 4.6 Repository Layer Refactor ✅

N-layered architecture: **Controller → Service → Repository → DbContext/Collection**.

`hotel-service`: 6 repository pairs (`IHotelRepository`, `IRoomRepository`, `IRoomAvailabilityRepository`, `IReservationRepository`, `INotificationRepository`, `IHotelImageRepository`) in `src/hotel-service/Repositories/`. `ReservationRepository.CreateBookingAsync` owns the pessimistic-lock transaction (`SELECT FOR UPDATE`); test seam via `protected virtual GetAvailabilityForUpdateAsync`. All 4 services (`BookingService`, `SearchService`, `HotelAdminService`, `NotificationService`) rewritten to inject repositories only — no direct `HotelDbContext` usage.

`comments-service`: `ICommentRepository` / `MongoCommentRepository` in `src/comments-service/Repositories/`. `CommentService` injects `ICommentRepository` only.

All 37 tests pass (30 hotel-service + 7 comments-service).

---

### 4.7 Custom Typed Exceptions ⏳

Replace `InvalidOperationException` with domain exceptions (`RoomNotAvailableException`, `HotelNotFoundException`, etc.) mapped to HTTP status codes via global exception handler.

---

## PHASE 5 — Frontend UX Polish

---

### 5.1 Member Discount Display ✅

File: `src/client/components/HotelCard.tsx`

When authenticated, show original price (strikethrough) + discounted price + "15% member discount" badge.
Backend already returns discounted price when JWT is present.

---

### 5.2 Error Toast Notifications ✅

File: `src/client/lib/api.ts` — add toast on failed fetch.
Add `<Toaster />` to `src/client/app/layout.tsx`.

---

### 5.3 Loading States ✅

- Search page: skeleton cards while fetching; spinner on search button
- Booking modal: disable confirm button + "Booking..." text during POST
- Admin hotels page: skeleton table rows while loading

---

### 5.4 AI Chat Error Handling ✅

`ChatWidget.tsx` catches errors from `chatWithAgent()` and displays a friendly inline error message. Loading indicator (`thinking` bouncing dots) shown during API call.

---

### 5.5 My Bookings Page ✅

File: `src/client/app/bookings/page.tsx` — calls `GET /api/v1/bookings`, shows table with hotel, room, dates, price, status badge.

---

### 5.6 My Account / Settings Page ✅

File: `src/client/app/account/page.tsx` — profile from Cognito ID token claims (`name`, `email`, `sub`).

---

### 5.7 Show on Map ✅

Split-view search results page (`app/search/page.tsx`) with interactive Leaflet map (`InteractiveMap.tsx`). Hotel pins on right, card list on left; clicking a pin highlights the card. `HotelCardCompact.tsx` used for map-view cards. Course requirement met.

---

### 5.8 All Navbar Buttons Functional ✅

File: `src/client/components/Header.tsx`
- "My Bookings" → `/bookings`
- "Account" / user avatar → `/account`
- "Sign In" → `/auth/signin`
- "Sign Up" → `/auth/signup`

---

### 5.8 Hotel Data Seeding ✅

Seed realistic demo data after Supabase wipe.

Target: 10–20 hotels across 5+ cities (Istanbul, Paris, London, Dubai, New York):
- 2–4 room types per hotel, base price $50–$500/night
- Availability windows for next 3 months
- At least one image per hotel
- `AdminEmail` must be the Resend account email (free tier restriction)
- `AdminSub` auto-fills from JWT when creating via admin panel

---

## PHASE 6 — Final Cleanup & Deliverables

---

### 6.1 docker-compose.yml cleanup ⏳
Delete `version: "3.9"` from line 1.

### 6.2 End-to-End Smoke Test ✅

| Flow | Steps | Expected |
|---|---|---|
| Guest search | Open search, pick dates, submit | Results shown, no discount badge |
| Member search | Sign in, same search | Results shown with 15% discount badge |
| Booking | Click book, confirm | Confirmation shown, notification appears |
| Email | Check inbox | Resend email arrived |
| AI chat | Ask "find me a hotel in Paris" | Agent calls search, returns results |
| Admin create | Log in as admin, create hotel + room + availability | Shows in search |
| Admin image | Upload image for hotel | Thumbnail appears |
| Nightly cron | Invoke Lambda manually | Capacity alert appears in admin panel |

### 6.3 Update README ⏳

Add: live URLs, architecture diagram (ASCII), local dev setup, test commands, CI/CD overview.

### 6.4 Demo Video ⏳

5-minute walkthrough: guest vs member search, book + email, admin CRUD, AI agent, Lambda invoke.
