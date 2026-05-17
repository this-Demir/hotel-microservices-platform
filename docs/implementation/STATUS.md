# Project Status & Remaining Work

Last updated: 17.05.2026
For code-level TODO details (snippets, file paths, step-by-step): `TODO_ADMIN_AND_DEPLOY.md`.

---

## What Is Done

### Backend — 100% complete and live

All 5 .NET 9 services deployed on Azure Container Apps, Germany West Central.
Every service passed CI (tests green) and CD (OIDC deploy to ACA).

| Service | URL | Verified |
|---|---|---|
| api-gateway | `https://api-gateway.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` | `GET /health` → 200 |
| hotel-service | internal | search → real Supabase data via gateway |
| comments-service | internal | deployed |
| notification-service | internal | deployed |
| ai-agent-service | internal | deployed |
| cron-jobs | AWS Lambda | nightly EventBridge trigger |

### CD Pipeline — 100% complete

5 GitHub Actions workflows, all green.
`test → build-and-push (GHCR) → deploy (az containerapp update)`.
Auth via OIDC federation — no stored Azure credentials anywhere.
Path-filtered — only the changed service's workflow runs.

### Frontends — built, not deployed

Both `src/client` and `src/admin-client` build successfully and are feature-complete UI-wise.
They have never been deployed to Vercel. `NEXT_PUBLIC_API_URL` is unset.
Currently running on **mock data only** — no live backend calls are made.

---

## What Is Broken / Missing

### 1. Auth is completely mocked in both frontends — BLOCKER

`src/client/lib/auth-context.tsx` and `src/admin-client/lib/auth-context.tsx` both use a hardcoded
fake token. `login()` performs no Cognito call whatsoever.

Every request that requires a JWT — booking, AI chat, notifications, all admin operations —
returns **401** from the real gateway. The only endpoints that work without auth are:
`GET /api/v1/search` and `GET /api/v1/comments/{hotelId}`.

This is the single largest gap. Auth must be fixed before any real user flow can be tested.

### 2. Frontends not deployed to Vercel

No public URLs for either frontend. Cannot test against live backend until deployed.

### 3. Cognito not configured for production

- No admin user exists in the User Pool
- No user groups (`Admin` / `User`)
- No Vercel URLs set as allowed callback/sign-out origins in the app client
- `ALLOW_USER_PASSWORD_AUTH` flow not confirmed on the app client (needed for `InitiateAuth`)

### 4. Admin panel missing features

- **Room delete** — no backend endpoint, no frontend button
- **Image upload** — backend endpoint exists (`POST /api/v1/admin/hotels/{id}/image`), frontend UI missing entirely
- **Image thumbnail** — hotel list shows no images

### 5. Minor cleanups

- `docker-compose.yml` still has `version: "3.9"` (Compose V2 warning on every command)
- Ocelot multipart forwarding for image upload through gateway — not yet tested with real auth

---

## What Breaks Without Real Auth

| Feature | Effect |
|---|---|
| Booking | 401 |
| AI chat | 401 |
| Notifications | 401 |
| 15% member discount | Never applied — discount is server-side, keyed on valid JWT |
| All admin CRUD | 401 |
| POST comment | 401 |
| GET search | ✅ Works (public) |
| GET comments | ✅ Works (public GET) |

---

## Remaining Work — Ordered by Dependency

### Session: Vercel deployment
1. Deploy `src/client` to Vercel, set `NEXT_PUBLIC_API_URL` to gateway URL
2. Deploy `src/admin-client` to Vercel, set same env var
3. Update gateway CORS: `Cors__AllowedOrigins` with both Vercel production URLs

### Session: Cognito setup
4. Confirm `ALLOW_USER_PASSWORD_AUTH` is enabled on the Cognito app client
5. Create an admin user in the User Pool with permanent password
6. Create `Admin` and `User` groups; add admin user to `Admin`
7. Add Vercel production URLs as allowed callback/sign-out origins in the app client

### Session: Real auth in frontends
8. Replace fake `login()` in `src/client/lib/auth-context.tsx` with real Cognito `InitiateAuth`
9. Wire `sign-in/page.tsx` and `sign-up/page.tsx` to use real credentials
10. Add `refresh_token` storage and 401-retry logic
11. Repeat for `src/admin-client/lib/auth-context.tsx`
12. Smoke-test: sign in → book → receive email, admin login → create hotel

### After auth works: missing admin features
13. Add `DELETE /api/v1/admin/rooms/{id}` to hotel-service + room delete button in admin-client
14. Add image upload UI to admin-client hotel detail page + `uploadHotelImage` in `api.ts`
15. Verify Ocelot forwards `multipart/form-data` correctly through the gateway
16. Confirm Supabase `hotel-images` bucket exists with public-read policy

### Final polish & deliverables
17. Remove `version: "3.9"` from `docker-compose.yml`
18. End-to-end smoke test: search (guest vs member price) → book → RabbitMQ → Resend email → in-app notification → AI chat
19. README: live URLs, architecture diagram, setup instructions
20. Demo video
