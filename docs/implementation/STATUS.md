# Project Status

Last updated: 20.05.2026 (Session 11)

---

## What Is Done

### Backend — 100% deployed and verified

All 5 .NET 9 services on Azure Container Apps, Germany West Central.

| Service | URL | Verified |
|---|---|---|
| api-gateway | `https://api-gateway.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` | `GET /health` → 200 |
| hotel-service | internal | search, booking, admin CRUD, notifications, reservations live |
| comments-service | internal | deployed |
| notification-service | internal | RabbitMQ consumer running, min-replicas=1 |
| ai-agent-service | internal | deployed |
| cron-jobs | AWS Lambda us-east-1 | deployed, EventBridge nightly `cron(0 1 * * ? *)`, test invoke verified |

### Frontends — both live on Vercel (Frankfurt)

| App | URL | Status |
|---|---|---|
| User client | `https://hotel-client-gold.vercel.app` | Live — search, booking, auth, notifications, My Bookings, My Account, interactive map, AI chat verified |
| Admin client | `https://hotel-admin-client.vercel.app` | Live — full CRUD, image gallery, notifications panel, reservations page, dashboard |

### Auth — real Cognito in both clients
- Pool: `us-east-1_AhVpOfGLE`, App client: `2b6bh0kh0g31djfclhcui2881l`
- User client sends **ID token** (required for `email` claim)
- Admin client sends **Access token** (has `sub` + `cognito:groups`; `adminSub` parsed from it)
- Admin user: admin account (credentials in local notes)
- Test user: Resend sandbox verified address (credentials in local notes)

### Notification pipeline — fully verified end-to-end (Session 9)
- book → RabbitMQ `booking-events` → notification-service → Resend email ✓ + Supabase Notifications row ✓
- Consumer resilient: email failures warn+continue; in-app notification always written
- mark-as-read fixed: `[HttpPatch]` → `[HttpPut]` in `NotificationsController` (Session 10)
- Ocelot: bare `GET /api/v1/notifications` route added (Session 10)

### Lambda capacity checker — deployed (Session 9), BUG-007 fixed (Session 10)
- IAM role: `arn:aws:iam::714807364884:role/lambda-capacity-checker-role`
- Function: `CapacityCheckerFunction`, dotnet10, 512MB, 60s
- EventBridge: `cron(0 1 * * ? *)` — 01:00 UTC nightly
- Now inserts notifications with `UserId = Hotels.AdminSub` (Cognito sub) instead of `AdminEmail`
- Full E2E verify pending (requires DB reseed with valid AdminSub on hotels)

### Schema — Hotels table (Session 10)
- `AdminSub` nullable text column added; migration `AddHotelAdminSub` applied to Supabase
- All new hotels created via admin panel auto-fill `AdminSub` from the logged-in admin's JWT

### Admin panel — fully extended (Sessions 8c, 9, 10)
- Hotel CRUD, Room CRUD (cascade guard), Availability CRUD (guard on ReservedCount)
- Hotel image gallery — multi-image with category titles, upload + delete UI
- **Dashboard** — stat cards (total hotels, total bookings) + recent 5 bookings table
- **Reservations page** — paginated table of all reservations with derived status
- **Notifications panel** — bell + unread badge in top bar; slide-out drawer with capacity alerts; mark-read persists to DB

---

## Open Bugs

| # | Severity | Description |
|---|---|---|
| BUG-008 | Low | Existing test hotels have empty `AdminEmail` and `AdminSub = NULL` — Lambda alerts won't fire for them. **Fix: wipe Supabase and reseed via admin panel** (planned). |

---

## Remaining Work

### Planned Next — Data Reset
- [ ] Wipe all Supabase rows (Hotels, Rooms, RoomAvailabilities, Reservations, Notifications, HotelImages)
- [ ] Reseed 10–20 hotels via admin panel (each auto-fills `AdminSub`; `AdminEmail` must be the Resend account email)
- [ ] Lambda E2E verify: manual invoke → notification row `UserId = <admin sub>` → visible in admin panel

### User Client — Remaining
- [ ] Member discount badge in search results
- [ ] Error toasts + loading states
- [ ] All navbar links functional

### Final Deliverables
- [ ] Remove `version: "3.9"` from docker-compose.yml
- [ ] End-to-end smoke test (all 8 flows)
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
