# Known Bugs & Issues

## Open

### BUG-001 — Admin panel fires API call with empty Bearer token
**Severity:** High  
**Symptom:** `GET /api/v1/admin/hotels` returns 503; request header shows `Authorization: Bearer` (no token).  
**Root cause:** The hotels page `useEffect` fires before the auth context `useEffect` has finished restoring the access token from `localStorage`. On first render, `token` is `''`, which gets captured in the closure.  
**Fix:** Gate the data-fetch `useEffect` on `token` being non-empty, or add `token` to its dependency array so it re-fires once the token is restored.  
**File:** `src/admin-client/app/hotels/page.tsx`

### BUG-002 — Ocelot global `ClientIdHeader` blocks public routes
**Severity:** High  
**Symptom:** `GET /api/v1/search` returns rate-limit error: `"Rate limiting client could not be identified... rule '0/1s/w0ms'"` even though the search route has no rate limiting configured.  
**Root cause:** `GlobalConfiguration.RateLimitOptions.ClientIdHeader: "Authorization"` causes Ocelot's rate-limit middleware to intercept all requests and require the header even on routes without `EnableRateLimiting: true`.  
**Workaround applied:** `GlobalConfiguration__RateLimitOptions__ClientIdHeader` env var set to empty on ACA — overrides the JSON config at runtime.  
**Permanent fix:** Remove `ClientIdHeader` from `ocelot.Production.json` GlobalConfiguration (committed, pending CI/CD deploy).  
**File:** `src/api-gateway/ocelot.Production.json`

### BUG-003 — Redis cache not populated (wrong connection string in ACA secret)
**Severity:** Medium  
**Symptom:** `DBSIZE = 0` in Redis; all search requests hit Supabase directly; `SearchService` silently falls through due to `catch {}`.  
**Root cause:** The `connectionstrings-redis` ACA secret had a stale/incorrect URL. The correct URL is `redis://default:...@tooth-bed-plastic-39581.db.redis.io:14377`.  
**Fix applied:** Secret updated via `az containerapp secret set`; hotel-service restarted. Needs end-to-end verification (do a search, then check `DBSIZE`).

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
