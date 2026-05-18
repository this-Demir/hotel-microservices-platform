# Project Status

Last updated: 18.05.2026 (Session 9)

---

## What Is Done

### Backend — 100% deployed and verified

All 5 .NET 9 services on Azure Container Apps, Germany West Central.

| Service | URL | Verified |
|---|---|---|
| api-gateway | `https://api-gateway.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` | `GET /health` → 200 |
| hotel-service | internal | search, booking, admin CRUD, notifications live |
| comments-service | internal | deployed |
| notification-service | internal | RabbitMQ consumer running, min-replicas=1 |
| ai-agent-service | internal | deployed |
| cron-jobs | AWS Lambda us-east-1 | deployed, EventBridge nightly `cron(0 1 * * ? *)`, test invoke verified |

### Frontends — both live on Vercel (Frankfurt)

| App | URL | Status |
|---|---|---|
| User client | `https://hotel-client-gold.vercel.app` | Live — search, booking, auth, notifications verified |
| Admin client | `https://hotel-admin-client.vercel.app` | Live — full CRUD, image gallery verified |

### Auth — real Cognito in both clients
- Pool: `us-east-1_AhVpOfGLE`, App client: `2b6bh0kh0g31djfclhcui2881l`
- Both clients send **ID token** (not access token) — required for `email` claim
- Admin user: `admin@hotelbooking.com` / `Admin@Hotel2026!`
- Test user: `demirdemirdogen@gmail.com` / `Test@1234567!` (Resend sandbox verified address)

### Notification pipeline — fully verified end-to-end (Session 9)
- book → RabbitMQ `booking-events` → notification-service → Resend email ✓ + Supabase Notifications row ✓
- Consumer resilient: email failures warn+continue; in-app notification always written

### Lambda capacity checker — deployed (Session 9)
- IAM role: `arn:aws:iam::714807364884:role/lambda-capacity-checker-role`
- Function: `CapacityCheckerFunction`, dotnet10, 512MB, 60s
- EventBridge: `cron(0 1 * * ? *)` — 01:00 UTC nightly
- Test invoke: "0 alert(s) sent" (no low-capacity rooms in test data yet)

### Admin panel — extended (Sessions 8c + 9)
- Hotel CRUD, Room CRUD (with cascade guards), Availability CRUD (with guard on ReservedCount)
- Hotel image gallery — multi-image with category titles, upload + delete UI
- All ghost buttons have visible borders

---

## Open Bugs

| # | Severity | Description |
|---|---|---|
| BUG-005 | High | `DELETE /api/v1/admin/hotels/{id}` with existing rooms returns 500 (FK constraint) instead of 409 |
| BUG-006 | Medium | Admin image upload returns 500 — likely Ocelot multipart forwarding or frontend FormData issue |
| BUG-007 | Medium | Lambda `InsertNotificationAsync` sets `UserId = AdminEmail` — should be admin's Cognito `sub` |
| BUG-008 | Low | Test hotel has empty `AdminEmail` — Lambda capacity alerts will never fire for it |

---

## Remaining Work (Phase 10)

### 10a — Bug Fixes
- [ ] Image upload 500 (BUG-006)
- [ ] Lambda `AdminEmail` empty on test hotel (BUG-008)
- [ ] Lambda `UserId = AdminEmail` mismatch — notifications never visible (BUG-007); fix: add `AdminSub` to Hotels, auto-fill from JWT in HotelModal, update Lambda to use `AdminSub`
- [ ] Admin notifications panel missing — no bell/drawer in admin-client to show Lambda capacity alerts

### 10b — AI Agent (Focus Next)
- [ ] End-to-end verify chat widget → `search_hotels` tool → hotel-service search API
- [ ] Booking via agent — `book_hotel` tool call with JWT forwarding
- [ ] Error handling + loading UX in chat widget

### 10c — Frontend Features
- [ ] My Bookings page (user's reservations list)
- [ ] My Account page (profile info from JWT)
- [ ] Show on Map — **required by course spec**
- [ ] Member discount badge in search results
- [ ] Error toasts + loading states

### 10d — Architecture Cleanup
- [ ] Repository layer (move DB calls out of services)
- [ ] Custom typed exceptions
- [ ] Backend + frontend input validation

### 10d — Final Deliverables
- [ ] Remove `version: "3.9"` from docker-compose.yml
- [ ] End-to-end smoke test
- [ ] README — live URLs, architecture diagram, ER diagrams, assumptions, known issues
- [ ] 5-minute demo video

---

## ACA Secrets (set, never in git)

| App | Secret | What it holds |
|---|---|---|
| hotel-service | `connectionstrings-postgres` | Supabase pooler URL |
| hotel-service | `connectionstrings-redis` | Upstash rediss:// URL |
| hotel-service | `connectionstrings-rabbitmq` | CloudAMQP amqps:// URL |
| hotel-service | `supabase-servicerolekey` | Supabase service role JWT |
| comments-service | `connectionstrings-mongodb` | MongoDB Atlas SRV URI |
| notification-service | `connectionstrings-supabase` | Supabase pooler URL |
| notification-service | `connectionstrings-rabbitmq` | CloudAMQP amqps:// URL |
| notification-service | `resend-apikey` | Resend API key |
| ai-agent-service | `openai-apikey` | OpenAI API key |
