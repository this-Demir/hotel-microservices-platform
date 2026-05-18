# Implementation TODO — Prioritized

Last updated: 18.05.2026  
Legend: ⏳ Pending | 🔜 Next

---

## PHASE 1 — Complete Missing Functionality

Everything in this phase must be done before the system is considered feature-complete.

---

### 1.1 Room Delete (backend + frontend)

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
File: `src/admin-client/lib/api.ts` — add `deleteRoom(id, token)` function.  
File: `src/admin-client/app/hotels/[id]/page.tsx` — add delete button next to each room row; confirm before delete.

---

### 1.2 Room Update / Edit (backend + frontend)

**Backend**  
File: `src/hotel-service/Services/HotelAdminService.cs` — add `UpdateRoomAsync(roomId, dto)`.  
File: `src/hotel-service/Controllers/AdminController.cs` — add `PUT /api/v1/admin/rooms/{id}`.  

**Frontend**  
File: `src/admin-client/app/hotels/[id]/page.tsx` — add Edit button; reuse RoomModal pre-filled with current values.

---

### 1.3 Availability Delete (backend + frontend)

**Backend**  
File: `src/hotel-service/Services/HotelAdminService.cs` — add `DeleteAvailabilityAsync(availabilityId)`.  
Guard: check no reservations cover this availability window before deleting.  
File: `src/hotel-service/Controllers/AdminController.cs` — add `DELETE /api/v1/admin/availability/{id}`.

**Frontend**  
File: `src/admin-client/app/hotels/[id]/page.tsx` — add delete button to availability table rows.

---

### 1.4 Image Upload UI (admin-client)

Backend endpoint already exists: `POST /api/v1/admin/hotels/{id}/image`

File: `src/admin-client/lib/api.ts`
```ts
export async function uploadHotelImage(id: string, file: File, token: string) {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(`${API_URL}/api/v1/admin/hotels/${id}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body, // DO NOT set Content-Type — browser sets multipart boundary
  })
  if (!res.ok) throw new Error('Image upload failed')
  return res.json()
}
```

File: `src/admin-client/app/hotels/[id]/page.tsx`
- Hotel cover image preview (show `hotel.imageUrl` or placeholder)
- `<input type="file" accept="image/*">` hidden, triggered by a button
- Client-side guard: reject files > 5 MB before uploading
- Show thumbnail in hotel list (`src/admin-client/app/hotels/page.tsx`)

Also verify: Supabase Dashboard → Storage → bucket `hotel-images` must exist with public-read policy.

Test end-to-end once real auth is in place:
```bash
curl -X POST <gateway>/api/v1/admin/hotels/{id}/image \
  -H "Authorization: Bearer <cognito_token>" \
  -F "file=@test.jpg"
```
If 400, add an explicit multipart route in `ocelot.Production.json` before the catch-all.

---

### 1.5 Lambda EventBridge Trigger

Lambda already deployed. Needs a nightly EventBridge rule to invoke it.

```bash
# Create the rule (fires at 02:00 UTC every day)
aws events put-rule \
  --name "nightly-capacity-check" \
  --schedule-expression "cron(0 2 * * ? *)" \
  --state ENABLED \
  --region us-east-1

# Add Lambda as target
aws events put-targets \
  --rule "nightly-capacity-check" \
  --targets "Id=1,Arn=<LAMBDA_ARN>" \
  --region us-east-1

# Grant EventBridge permission to invoke the Lambda
aws lambda add-permission \
  --function-name HotelBookingCronJobs \
  --statement-id EventBridgeInvoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn <RULE_ARN> \
  --region us-east-1
```

After creating, do a manual test invoke:
```bash
aws lambda invoke --function-name HotelBookingCronJobs --payload '{}' out.json --region us-east-1
cat out.json
```

---

### 1.6 Notification End-to-End Verification

Flow: book a room → hotel-service publishes `BookingEvent` to RabbitMQ → notification-service consumer receives → Resend email sent + in-app `Notifications` row inserted.

Steps:
1. Sign in as a real user in the frontend
2. Book an available room
3. Check CloudAMQP dashboard — confirm `booking-events` queue received a message
4. Check notification-service ACA logs: `az container logs -g rg-hotelbooking-prod --name notification-service`
   - Look for "Consumed BookingEvent" log line
5. Check email inbox (the one used at sign-up) — Resend confirmation email
6. Check notifications panel in the user client — unread badge should appear

If Resend is blocked:
- Verify from-address is `onboarding@resend.dev` (allowed on free tier) or a verified domain
- Check notification-service `RESEND_API_KEY` env var in ACA secrets

---

### 1.7 Admin Reservations View

Endpoint already exists: `GET /api/v1/bookings/reservations` (hotel-service, `[Authorize]`)

File: `src/admin-client/app/reservations/page.tsx` (new page)
- Table: guest sub, hotel name, room type, check-in, check-out, price paid, status
- Pagination (reuse pattern from hotels page)
- Add "Reservations" link to the admin sidebar in `AdminShell`

---

### 1.8 Cache Invalidation on Hotel/Room/Availability Writes

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

## PHASE 2 — Input Validation

All validation failures should return `400 Bad Request` with a clear error message.

---

### 2.1 Backend — Validation Attributes on DTOs

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

### 2.2 Backend — Delete Cascade Checks

File: `src/hotel-service/Services/HotelAdminService.cs`

- `DeleteHotelAsync`: check no rooms exist for this hotel; return 409 if they do (or cascade-delete rooms+availability together — document the choice)
- `DeleteRoomAsync`: check no active/future reservations; return 409 if they exist
- `DeleteAvailabilityAsync`: check no overlapping reservations

---

### 2.3 Frontend — Form Validation

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

### 3.1 Location Search Improvement

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

### 3.2 Database Indexes

Add an EF Core migration:
```csharp
migrationBuilder.CreateIndex("IX_RoomAvailabilities_IsVacant_CheckIn_CheckOut",
    "RoomAvailabilities", new[] { "IsVacant", "CheckIn", "CheckOut" });
migrationBuilder.CreateIndex("IX_Rooms_HotelId", "Rooms", "HotelId");
migrationBuilder.CreateIndex("IX_Hotels_Location", "Hotels", "Location");
```

These are critical for search queries that filter by date range + vacancy + hotel.

---

### 3.3 Search Result Ranking

After fetching results, rank by:
1. Star rating (descending)
2. Base price (ascending if no auth, discounted price if authenticated)
3. Availability count (descending — more open slots first)

This is a pure service-layer change in `SearchService.cs`, no DB changes needed.

---

## PHASE 4 — Backend Polish

---

### 4.1 Notification Consumer — Crash Protection

File: `src/notification-service/Consumers/BookingEventConsumer.cs`

Wrap the entire message handler body:
```csharp
try
{
    var booking = JsonSerializer.Deserialize<BookingEvent>(body);
    await _emailService.SendBookingConfirmationAsync(booking!);
    await _notificationWriter.WriteAsync(booking!);
    _channel.BasicAck(ea.DeliveryTag, multiple: false);
}
catch (Exception ex)
{
    _logger.LogError(ex, "Failed to process BookingEvent. Nacking message.");
    _channel.BasicNack(ea.DeliveryTag, multiple: false, requeue: false);
}
```

---

### 4.2 AI Agent Tool Error Recovery

File: `src/ai-agent-service/Services/AgentService.cs`

In the tool call execution loop, catch HTTP errors from hotel-service:
```csharp
try { result = await ExecuteToolAsync(toolCall); }
catch (HttpRequestException ex) {
    result = $"{{\"error\": \"Tool execution failed: {ex.Message}\"}}";
}
```
Append the error result to the message list so OpenAI can explain the failure gracefully.

---

### 4.3 Token Refresh on 401 (User Client)

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

## PHASE 5 — Frontend UX Polish

---

### 5.1 Member Discount Display

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

### 5.2 Error Toast Notifications

Install: `npm install react-hot-toast` (or use existing shadcn/ui `sonner` if available)

File: `src/client/lib/api.ts` — after each failed fetch:
```ts
import toast from 'react-hot-toast'
toast.error('Booking failed. Please try again.')
```

Add `<Toaster />` to `src/client/app/layout.tsx`.

---

### 5.3 Loading States

File: `src/client/app/search/page.tsx`
- Show skeleton cards while fetching results
- Disable search button during fetch; show spinner

File: `src/client/components/BookingModal.tsx`
- Disable "Confirm Booking" button during POST
- Show "Booking..." text on button

File: `src/admin-client/app/hotels/page.tsx`
- Show skeleton table rows while fetching hotels

---

### 5.4 AI Chat Error Handling

File: `src/client/components/AIChat.tsx`

If `chatWithAgent()` throws:
```tsx
setMessages(prev => [...prev, {
  role: 'assistant',
  content: 'Sorry, I could not process your request. Please try again.'
}])
```

---

### 5.5 Admin Dashboard / Stats Page

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

### 6.1 docker-compose.yml cleanup

File: `docker-compose.yml` line 1 — delete `version: "3.9"`. Compose V2 ignores it and prints a warning.

### 6.2 End-to-End Smoke Test

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

### 6.3 Update README

File: `README.md`

Add sections:
- Live URLs (gateway, user client, admin client)
- Architecture diagram (ASCII or image link)
- Local dev setup (docker-compose + env vars)
- Test commands (`dotnet test`)
- CI/CD overview

### 6.4 Demo Video

5-minute walkthrough covering:
1. Search as guest vs member (show price difference)
2. Book a room, receive email
3. Admin panel: create hotel/room/availability
4. AI agent chat
5. Nightly Lambda invoke
