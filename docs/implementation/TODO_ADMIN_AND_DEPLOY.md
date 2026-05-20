# Admin Flow & Deploy Readiness — TODO

Last updated: 20.05.2026 (Session 10)
Legend: ✅ Done | ⏳ Pending | 🔜 Next session

---

## Auth
- ✅ Replace mock login with real Cognito `InitiateAuth` — both clients
- ✅ Create admin user in Cognito (Admin group)
- ✅ Admin group guard in admin-client login flow
- ✅ User client sends ID token (required for `email` claim); admin client sends access token (for `sub` + `cognito:groups`)
- ⏳ Token refresh on 401 — store refresh token, call `grant_type=refresh_token` on expired token

## Image Upload
- ✅ Backend endpoint `POST /api/v1/admin/hotels/{id}/images` — implemented
- ✅ Supabase Storage bucket `hotel-images` — exists, public-read
- ✅ Image gallery UI in admin panel — multi-image with category titles, upload + delete
- ✅ **BUG-006 FIXED** — upload returned 500; fixed by reading Supabase error body + creating `hotel-images` bucket; WebP accepted via `accept="image/*"`

## Admin CRUD
- ✅ Room delete (backend + frontend, cascade guard 409 if reservations)
- ✅ Room edit (backend + frontend, RoomModal reused)
- ✅ Availability delete (backend + frontend, guard on ReservedCount > 0)
- ✅ Hotel delete (backend; cascade guard 409 for rooms — **BUG-005 fixed**)
- ✅ Admin reservations view — `GET /api/v1/admin/reservations` → `app/reservations/page.tsx` (paginated, derived status)
- ✅ Admin notifications panel — bell + unread badge in AdminShell; slide-out amber drawer; mark-read persists to DB (**BUG-007 fixed**)
- ✅ AdminSub column — `Hotels.AdminSub` nullable text; EF migration applied; HotelModal auto-fills from JWT `sub` on create
- ✅ Admin dashboard — stat cards (total hotels, total bookings) + recent 5 bookings table

## Backend Resilience
- ✅ RabbitMQ startup retry (5-attempt loop, `AutomaticRecoveryEnabled`)
- ✅ Health check endpoints on all 5 services
- ✅ Notification consumer crash protection — email failures isolated, in-app notification always written
- ✅ Notification mark-read fixed — `[HttpPatch]` → `[HttpPut]` in `NotificationsController`
- ✅ Bare `/api/v1/notifications` GET route added to both `ocelot.json` and `ocelot.Production.json`

## Deployment Pipeline
- ✅ GitHub Actions for all 5 ACA services (`test → build-and-push → deploy`)
- ✅ OIDC federation — no stored Azure credentials
- ✅ AWS GitHub secrets set (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `LAMBDA_EXECUTION_ROLE_ARN`)
- ✅ Vercel env vars set on both clients (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_AUTHORITY`)
- ✅ Cognito app client callback URLs updated with Vercel production URLs
- ✅ Gateway CORS updated with both Vercel URLs
- ⏳ Remove `version: "3.9"` from `docker-compose.yml`

## User Client Features
- ✅ Real Cognito auth (`InitiateAuth`, ID token, refresh token stored)
- ✅ Booking sends JWT via Authorization header
- ✅ AI chat widget wired to `POST /api/v1/agent/chat` — error handling + loading indicator implemented
- ✅ In-app notifications panel (bell, unread badge, mark-read)
- ✅ My Bookings page — `app/bookings/page.tsx`
- ✅ My Account page — `app/account/page.tsx` (profile from JWT claims)
- ✅ Show on Map — split view with interactive Leaflet pins (course requirement)
- ⏳ Member 15% discount badge visible in search results
- ⏳ All navbar links functional
- ⏳ Error toasts + loading skeletons

## Data Reset (Pending)
- ⏳ Wipe Supabase rows (Hotels, Rooms, RoomAvailabilities, Reservations, Notifications, HotelImages)
- ⏳ Reseed 10–20 hotels via admin panel (AdminSub auto-fills; AdminEmail must match Resend account email)
- ⏳ Lambda E2E verify after reseed — confirm notification row `UserId = <admin sub>` → appears in admin panel
