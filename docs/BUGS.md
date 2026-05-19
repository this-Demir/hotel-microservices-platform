# Known Bugs & Issues

## Open

### BUG-012 — Comments service returns 500 on all requests (RESOLVED)
**Severity:** High
**Symptom:** `GET /api/v1/comments/{hotelId}` and `POST /api/v1/comments` both return 500.
**Root cause (two issues):**
1. **MongoDB Atlas IP whitelist missing** — ACA static egress IP `98.67.199.210` was not whitelisted in Atlas Network Access → SSL handshake failure (`tlsv1 alert internal error`). **Fixed:** IP added to Atlas allowlist, container restarted.
2. **Index creation in scoped constructor** — `CommentService` was registered as `Scoped` but called `_collection.Indexes.CreateOne()` synchronously in its constructor (`CommentService.cs:18`). Any transient MongoDB error during construction killed the entire request, and DI cannot recover. **Fixed:** index creation moved to `MongoIndexInitializer : IHostedService` which runs once at startup before the host accepts traffic.
**Fix:**
- `src/comments-service/Services/MongoIndexInitializer.cs` — new `IHostedService`; creates `HotelId` index via `CreateOneAsync` in `StartAsync`; swallows startup errors (index is an optimisation, not a correctness requirement).
- `src/comments-service/Services/CommentService.cs` — removed sync index creation from constructor; constructor now does field assignment only.
- `src/comments-service/Program.cs` — `AddHostedService<MongoIndexInitializer>()` registered after `IMongoClient`.
**Status:** Both issues resolved. All 5 unit tests pass.

---

### BUG-005 — Hotel delete hits FK constraint without user-facing error
**Severity:** High
**Symptom:** `DELETE /api/v1/admin/hotels/{id}` with existing rooms returns 500 (Npgsql FK violation) instead of 409.
**Root cause:** `HotelAdminService.DeleteHotelAsync` has no child-count pre-check.
**Fix:** Query child rooms before delete; return 409 with message if any exist.
**File:** `src/hotel-service/Services/HotelAdminService.cs`


### BUG-007 — Lambda inserts notification with AdminEmail as UserId
**Severity:** Medium
**Symptom:** Capacity alert notifications written to Supabase use `AdminEmail` as the `UserId` column, which should hold the admin's Cognito `sub`.
**Root cause:** `InsertNotificationAsync` in `Function.cs` sets `@userId = alert.AdminEmail`.
**Fix:** Store admin's Cognito `sub` in `Hotels.AdminSub` column (or resolve sub from email at query time).
**File:** `src/cron-jobs/Function.cs`

### BUG-008 — Test hotel has empty AdminEmail, Lambda alerts never fire
**Severity:** Low
**Symptom:** Lambda runs successfully but sends 0 alerts even when capacity thresholds are met.
**Root cause:** The test hotel row in Supabase has an empty `AdminEmail` field.
**Fix:** Update test hotel via admin panel or direct SQL to set a valid `AdminEmail`.

---

## Resolved

| # | Description | Fix | Session |
|---|---|---|---|
| R-001 | CORS not configured with Vercel URLs | `Cors__AllowedOrigins` env var updated on api-gateway ACA | 8a |
| R-002 | Both frontends using mock auth (fake JWT) | Real Cognito `InitiateAuth` wired in both clients | 8b |
| R-003 | Cognito app client had a secret (unusable from browser) | New public client `2b6bh0kh0g31djfclhcui2881l` created | 8b |
| R-004 | `NEXT_PUBLIC_COGNITO_CLIENT_ID` had BOM character in Vercel env | Re-entered manually via Vercel dashboard | 8b |
| R-005 | hotel-service cold start → 503 on first request after idle | `min-replicas` raised from 0 to 1 | 8b |
| R-006 | Accidental duplicate Vercel project created during CLI linking | User deleted duplicate; re-linked to correct project | 8a |
| BUG-001 | Admin panel fires API call with empty Bearer token (useEffect race) | Gated data-fetch `useEffect` on token being non-empty | 8b |
| BUG-002 | Ocelot global `ClientIdHeader` blocks public routes | Removed `ClientIdHeader` from GlobalConfiguration | 8b |
| BUG-003 | Redis cache not populated (wrong connection string in ACA secret) | Secret updated; 304 cache hits verified from UI | 8b |
| BUG-004 | Notification consumer crashes on malformed/failed event, infinite requeue loop | Isolated email try-catch; email failures warn+continue, message always ACKed | 9b |
| BUG-009 | Queue name mismatch — hotel-service published to `booking-events`, notification-service listened on `booking.events` | Aligned queue name in `BookingEventConsumer.cs` | 9b |
| BUG-010 | JWT `sub` claim remapped by .NET middleware — `FindFirst("sub")` returned null | Added `MapInboundClaims = false` to `AddJwtBearer` in hotel-service + comments-service | 9b |
| BUG-011 | Frontend sent access token instead of ID token — `email` claim missing, Resend rejected with 422 | `auth-context.tsx`: `setToken(accessToken)` → `setToken(idToken)` | 9b |
| BUG-006 | Admin image upload returned 500 | `EnsureSuccessStatusCode()` was swallowing Supabase "Bucket not found" as unhandled `HttpRequestException`; fix reads error body + controller catches it; Supabase `hotel-images` bucket created in dashboard | 9c |
