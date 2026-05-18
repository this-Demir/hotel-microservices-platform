# Admin Flow & Deploy Readiness — TODO

Last updated: 18.05.2026 (Session 9)
Legend: ✅ Done | ⏳ Pending | 🔜 Next session

---

## Auth
- ✅ Replace mock login with real Cognito `InitiateAuth` — both clients
- ✅ Create admin user in Cognito (Admin group)
- ✅ Admin group guard in admin-client login flow
- ✅ Both clients send ID token (not access token) — required for `email` claim
- ⏳ Token refresh on 401 — store refresh token, call `grant_type=refresh_token` on expired token

## Image Upload
- ✅ Backend endpoint `POST /api/v1/admin/hotels/{id}/images` — implemented
- ✅ Supabase Storage bucket `hotel-images` — exists, public-read
- ✅ Image gallery UI in admin panel — multi-image with category titles, upload + delete
- ⏳ **BUG-006: Upload returns 500** — investigate Ocelot multipart forwarding; may need explicit route before catch-all in `ocelot.Production.json`
- ⏳ Support `.webp` format — verify `accept="image/*"` includes webp; test Supabase storage accepts webp uploads

## Admin CRUD
- ✅ Room delete (backend + frontend, cascade guard 409 if reservations)
- ✅ Room edit (backend + frontend, RoomModal reused)
- ✅ Availability delete (backend + frontend, guard on ReservedCount > 0)
- ✅ Hotel delete (backend; cascade guard for rooms)
- ⏳ Admin reservations view — `GET /api/v1/bookings/reservations` → new page `app/reservations/page.tsx`
- ⏳ Admin notifications panel — bell/drawer in AdminShell showing Lambda capacity alerts (requires BUG-007 fix first)

## Backend Resilience
- ✅ RabbitMQ startup retry (5-attempt loop, `AutomaticRecoveryEnabled`)
- ✅ Health check endpoints on all 5 services
- ✅ Notification consumer crash protection — email failures isolated, in-app notification always written

## Deployment Pipeline
- ✅ GitHub Actions for all 5 ACA services (`test → build-and-push → deploy`)
- ✅ OIDC federation — no stored Azure credentials
- ✅ AWS GitHub secrets set (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `LAMBDA_EXECUTION_ROLE_ARN`)
- ✅ Vercel env vars set on both clients (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_AUTHORITY`)
- ✅ Cognito app client callback URLs updated with Vercel production URLs
- ✅ Gateway CORS updated with both Vercel URLs
- ⏳ Remove `version: "3.9"` from `docker-compose.yml`

## User Client Gaps
- ✅ Real Cognito auth (`InitiateAuth`, ID token, refresh token stored)
- ✅ Booking sends JWT via Authorization header
- ✅ AI chat widget wired to `POST /api/v1/agent/chat`
- ✅ In-app notifications panel (bell, unread badge, mark-read)
- ⏳ My Bookings page
- ⏳ My Account / Settings page (profile info + preferences)
- ⏳ All navbar buttons functional (currently some are placeholder links)
- ⏳ Member 15% discount badge visible in search results
