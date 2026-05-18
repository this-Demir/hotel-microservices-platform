# Project Status

Last updated: 18.05.2026

---

## What Is Done

### Backend — 100% complete and live

All 5 .NET 9 services deployed on Azure Container Apps, Germany West Central.

| Service | URL | Verified |
|---|---|---|
| api-gateway | `https://api-gateway.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` | `GET /health` → 200 |
| hotel-service | internal | search + booking + admin CRUD live |
| comments-service | internal | deployed |
| notification-service | internal | deployed, consumer running |
| ai-agent-service | internal | deployed |
| cron-jobs | AWS Lambda | **NOT YET DEPLOYED** — code ready, policies granted |

### Frontends — both live on Vercel (Frankfurt)

| App | URL | Status |
|---|---|---|
| User client | `https://hotel-client-gold.vercel.app` | Live — search + real data + auth verified |
| Admin client | `https://hotel-admin-client.vercel.app` | Live — full CRUD verified |

### Auth — real Cognito wired in both clients

- App client `2b6bh0kh0g31djfclhcui2881l` (no secret, `USER_PASSWORD_AUTH`)
- Real `InitiateAuth` in both clients
- Admin user: `admin@hotelbooking.com` / `Admin@Hotel2026!`

### Search + Redis cache — verified working

- Cache hits return 304; post-invalidation queries return 200
- New hotels/rooms/availability appear in search results immediately

### Admin panel — extended this session (2026-05-18)

- **Room delete** ✓ — `DELETE /api/v1/admin/rooms/{id}`, cascade guard (409 if reservations exist)
- **Room edit** ✓ — `PUT /api/v1/admin/rooms/{id}`, RoomModal extended for create+edit
- **Availability delete** ✓ — `DELETE /api/v1/admin/availability/{id}`, guard on ReservedCount > 0
- **Hotel image gallery** ✓ — new `HotelImages` table (migration applied to Supabase), multiple images per hotel with category titles (room-interior, room-overall, lobby, exterior, pool, restaurant, spa, bathroom, corridor, terrace), upload + delete UI in admin panel

---

## What Is Missing / Not Yet Done

### Lambda + EventBridge — NEXT PRIORITY

- AWS IAM policies granted to `Me` user: `AWSLambda_FullAccess`, `AmazonEventBridgeFullAccess`, inline policy for `iam:CreateRole/AttachRolePolicy/GetRole/PassRole` scoped to `lambda-capacity-checker-role`
- **Still needed:**
  1. Create execution role `lambda-capacity-checker-role` (attach `AWSLambdaBasicExecutionRole`)
  2. Deploy function `CapacityCheckerFunction` via `dotnet lambda deploy-function`
  3. Set env vars: `SUPABASE_CONNECTION_STRING`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`
  4. Create EventBridge rule `nightly-capacity-check` (`cron(0 2 * * ? *)`)
  5. Wire Lambda as EventBridge target + grant invoke permission
  6. Manual test invoke
  7. Set GitHub secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `LAMBDA_EXECUTION_ROLE_ARN`) so CD pipeline works

### Notification end-to-end — not yet verified

- book → RabbitMQ → notification-service → Resend email → in-app notification
- Needs a real booking with auth to test

### Remaining functional gaps

| # | Gap |
|---|---|
| F-7 | Admin: reservations/bookings view page |
| F-8 | Cache invalidation on hotel/room/availability writes |

### Input validation gaps (Phase 2)

- Backend DTO validation attributes (hotel, room, availability, comments)
- Frontend form validation (admin modals, search card)

### Performance (Phase 3)

- Location search: switch to `EF.Functions.ILike` (case-insensitive)
- DB indexes on IsVacant, CheckIn/CheckOut, GuestCount
- Result ranking (stars → price → availability)

### Backend polish (Phase 4)

- Notification consumer try-catch (BUG-004)
- AI agent tool error recovery
- 401 token refresh retry in `client/lib/api.ts`

### Frontend UX (Phase 5)

- Member 15% discount badge in search results
- Error toasts + loading states + skeleton screens
- Admin dashboard/stats page

### Final (Phase 6)

- Remove `version: "3.9"` from docker-compose.yml
- End-to-end smoke test (all flows)
- README live URLs + architecture diagram
- Demo video

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
