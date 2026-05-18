# Known Bugs & Issues

## Open

### BUG-004 — Notification consumer crashes on malformed RabbitMQ message
**Severity:** High  
**Symptom:** notification-service goes down silently if hotel-service publishes a malformed `BookingEvent`.  
**Root cause:** `BookingEventConsumer` has no try-catch around `JsonSerializer.Deserialize` or the email/DB calls.  
**Fix:** Wrap the consumer body in try-catch; log and acknowledge (or dead-letter) on failure.  
**File:** `src/notification-service/Consumers/BookingEventConsumer.cs`

### BUG-005 — Hotel/room delete hits FK constraint without user-facing error
**Severity:** High  
**Symptom:** `DELETE /api/v1/admin/hotels/{id}` with existing rooms returns 500 (Npgsql FK violation) instead of 409/400.  
**Root cause:** `HotelAdminService.DeleteHotelAsync` calls `_db.SaveChangesAsync()` with no pre-check.  
**Fix:** Query child count before delete; return 409 with message if children exist.  
**File:** `src/hotel-service/Services/HotelAdminService.cs`

---

## Resolved

| # | Description | Fix |
|---|---|---|
| R-001 | CORS not configured with Vercel URLs | `Cors__AllowedOrigins` env var updated on api-gateway ACA |
| R-002 | Both frontends using mock auth (fake JWT) | Real Cognito `InitiateAuth` wired in both clients |
| R-003 | Cognito app client had a secret (unusable from browser) | New public client `2b6bh0kh0g31djfclhcui2881l` created (no secret, `USER_PASSWORD_AUTH`) |
| R-004 | `NEXT_PUBLIC_COGNITO_CLIENT_ID` had BOM character in Vercel env var | Re-entered manually via Vercel dashboard |
| R-005 | hotel-service cold start → 503 on first request after idle | `min-replicas` raised from 0 to 1 |
| R-006 | Accidental new Vercel project created during CLI linking | User deleted duplicate; re-linked to correct `hotel-client` project |
| BUG-001 | Admin panel fires API call with empty Bearer token (useEffect race) | Gated data-fetch useEffect on token being non-empty |
| BUG-002 | Ocelot global `ClientIdHeader` blocks public routes | Removed `ClientIdHeader` from GlobalConfiguration; env var override applied |
| BUG-003 | Redis cache not populated (wrong connection string in ACA secret) | Secret updated; verified 304 cache hits from UI (2026-05-18) |
