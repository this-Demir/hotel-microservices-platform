# Known Bugs & Issues

## Open

No open bugs.

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
| BUG-012 | Comments service returned 500 on all requests | (1) Atlas IP whitelist → `0.0.0.0/0`; (2) index creation moved from Scoped constructor to `MongoIndexInitializer : IHostedService`; (3) `GuidSerializer(Standard)` registered globally for Driver v3 compatibility | 10a |
| BUG-005 | Hotel delete hits FK constraint returning 500 | `DeleteHotelAsync` now checks child rooms first; returns 409 with message if any exist | 10a |
| BUG-007 | Lambda inserts notification with `AdminEmail` as `UserId` | Added `AdminSub` (nullable text) to `Hotels`; EF migration applied; `HotelModal.tsx` auto-fills from JWT `sub` on create; Lambda now uses `AdminSub ?? ""` as `UserId` | 10 |
| BUG-008 | Existing hotels have NULL `AdminSub`, Lambda alerts won't reach admin panel | DB wiped and reseeded via admin panel — new hotels auto-fill `AdminSub` from creating admin's JWT `sub` | 11 |
