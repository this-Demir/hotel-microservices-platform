# Implementation Phases

Checklist of every step across all phases. Check off items as they are completed.

---

## Phase 1 — Monorepo Scaffold

- [x] Folder structure created (`/src`, `/docs`, `/.github`)
- [x] Architecture docs written (`docs/0–4`)
- [x] `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `LICENSE`
- [x] `.NET 9` solution (`HotelBooking.sln`) with 5 service projects
- [x] All NuGet packages installed and pinned
- [x] `docker-compose.yml` for local dev (Postgres, MongoDB, Redis, RabbitMQ)
- [x] `Dockerfile` in every backend service
- [x] 8 GitHub Actions workflows with path filtering
- [x] `hotel-service` models, DTOs, `HotelDbContext`, 4 thin controllers, 4 service interfaces

---

## Phase 2 — DI & Program.cs Wiring

- [x] `api-gateway` — Ocelot + JWT Bearer (Cognito)
- [x] `hotel-service` — Npgsql DbContext, JWT Bearer, Upstash Redis, CloudAMQP RabbitMQ
- [x] `comments-service` — MongoDB Atlas client, JWT Bearer
- [x] `notification-service` — Resend client, CloudAMQP RabbitMQ
- [x] `ai-agent-service` — OpenAI client, JWT Bearer, named HttpClient for hotel-service
- [x] `appsettings.json` config structure for every service
- [x] `ocelot.json` placeholder created

---

## Phase 3 — Service Skeletons

- [x] `WeatherForecast` boilerplate removed from all services
- [x] `comments-service` — `HotelComment` model, `CommentDtos`, `ICommentService`, `CommentsController`
- [x] `notification-service` — `BookingEvent`, `IEmailService`, `INotificationWriter`, `BookingEventConsumer`
- [x] `ai-agent-service` — `AgentDtos`, `IAiAgentService`, `AgentController`
- [x] `api-gateway` — `ocelot.json` routes for all services (auth-gated where required)
- [x] All services build with 0 errors

---

## Phase 4 — hotel-service Implementation

- [x] `HotelAdminService` — CRUD for Hotels, Rooms, RoomAvailability
- [x] `SearchService` — filter by destination / dates / guest count
- [x] `SearchService` — Redis cache-aside for hotel details
- [x] `SearchService` — 15% discount when JWT present
- [x] `BookingService` — `SELECT FOR UPDATE` transaction
- [x] `BookingService` — capacity decrement + `IsVacant` auto-set
- [x] `BookingService` — publish `BookingEvent` to RabbitMQ after commit
- [x] `NotificationService` — query `Notifications` table (paginated)
- [x] `NotificationService` — mark as read
- [x] Register all concrete services in `hotel-service/Program.cs`
- [x] Add `AdminEmail` field to `Hotels` model (required by cron-jobs)
- [x] EF Core migrations (`InitialCreate` + `AddHotelImageUrl`)
- [x] Apply migration against Supabase (via SQL Editor — IPv6 workaround)

---

## Phase 4b — hotel-service Unit Tests

- [x] xUnit test project at `src/hotel-service-tests/`
- [x] EF Core InMemory database (TransactionIgnoredWarning suppressed for BookingService)
- [x] Moq `IConnectionMultiplexer` (Redis) — cache-miss and cache-hit paths
- [x] Moq `IConnection` / `IChannel` (RabbitMQ) — publish no-throw
- [x] `TestableBookingService` overrides `GetAvailabilityForUpdateAsync` with LINQ (replaces raw `SELECT FOR UPDATE`)
- [x] `HotelAdminServiceTests` — 11 tests (CRUD, pagination, availability upsert)
- [x] `SearchServiceTests` — 8 tests (discount, cache hit/miss, empty result)
- [x] `BookingServiceTests` — 8 tests (capacity decrement, IsVacant flip, discount, pagination)
- [x] `NotificationServiceTests` — 3 tests (scoped query, mark-read, wrong-user guard)
- [x] 30/30 tests passing, 0 warnings
- [x] CI workflow updated — `test` job gates `build-and-push`; triggers on PRs
- [x] `.mcp.json` added to `.gitignore`

---

## Phase 5 — Remaining Service Implementations

### comments-service
- [x] `CommentService.CreateAsync` — insert MongoDB document
- [x] `CommentService.GetByHotelAsync` — filter + paginate
- [x] Create MongoDB index on `hotelId`
- [x] Register `CommentService` in `Program.cs`

### notification-service
- [x] `EmailService.SendBookingConfirmationAsync` — Resend email template
- [x] `EmailService.SendCapacityAlertAsync` — Resend alert template
- [x] `NotificationWriter.WriteAsync` — insert row to Supabase `Notifications`
- [x] Register `EmailService` and `NotificationWriter` in `Program.cs`

### ai-agent-service
- [x] `AgentService.ChatAsync` — build `ChatCompletionOptions` with tool definitions
- [x] Tool: `search_hotels` → `GET /api/v1/search` on hotel-service
- [x] Tool: `book_hotel` → `POST /api/v1/bookings` on hotel-service
- [x] Handle OpenAI tool call loop (call tool → append result → continue)
- [x] Forward user JWT on all hotel-service calls
- [x] Register `AgentService` in `Program.cs`

### cron-jobs (Lambda)
- [x] `Function.cs` — open Npgsql connection
- [x] Query rooms below 20% capacity for next month
- [x] Send capacity alert email via Resend for each result
- [x] Insert `Notifications` row for each alert
- [x] Register EventBridge rule `nightly-capacity-check` (`cron(0 1 * * ? *)`) — deployed Phase 9

---

## Phase 6 — Cloud Wiring & Secrets

### 6a — Credentials & Local Wiring (Done)
- [x] Create Supabase project + get connection string (pooler URL for IPv4 compat)
- [x] Create MongoDB Atlas cluster + get connection string
- [x] Create Redis Cloud free instance + get connection string (switched from Upstash — no free tier)
- [x] Create CloudAMQP instance + get AMQP URL
- [x] Create Resend account + get API key (`onboarding@resend.dev` as from-email)
- [x] Set up AWS Cognito user pool (`us-east-1_AhVpOfGLE`) + App Client + Authority URL
- [x] Set up OpenAI account + get API key (billing cap recommended)
- [x] All `appsettings.Development.json` files updated with real credentials (gitignored)
- [x] `.env` + `.env.example` created for docker-compose
- [x] `docker-compose.yml` rewritten — all 7 services wired with env vars
- [x] `ocelot.Docker.json` created — docker service names (port 8080)
- [x] `api-gateway/Program.cs` — env-specific ocelot file loading + CORS policy
- [x] `src/client/Dockerfile` + `src/admin-client/Dockerfile` created
- [x] `launchSettings.json` ports fixed across all services (avoid Windows Hyper-V exclusions)
- [x] `ocelot.json` ports updated to match launchSettings (7000–7004 range)
- [x] Redis connection string switched from `rediss://` URL to StackExchange.Redis native format
- [x] Supabase direct host replaced with session pooler (`aws-1-ap-northeast-1.pooler.supabase.com`)
- [x] `SearchRequest` date params made optional (defaults to today / today+1)
- [x] `GET /api/v1/search/hotel/{hotelId}` — new public hotel detail endpoint
- [x] `GET /api/v1/admin/availability?roomId=` — new admin availability GET endpoint
- [x] `ocelot.json` — added `/api/v1/search/{everything}` route
- [x] `client/lib/api.ts` — all API URLs fixed to match real backend routes
- [x] `client/.env.local` — updated to port 7000
- [x] `admin-client/.env.local` — created pointing to gateway port 7000
- [x] Local demo verified: search, hotel detail, gateway routing, Redis cache, Supabase all working

### 6b — Cloud Deployment (Done — Azure Container Apps)

Platform switched from Google Cloud Run → **Azure Container Apps** (Consumption plan, Germany West Central).

- [x] Create Azure resource group `rg-hotelbooking-prod` + Container Apps Environment `cae-hotelbooking`
- [x] Set up OIDC federation (no stored credentials) — service principal `5403a930-d7a2-4c0c-a3d4-3a27b57c9699`
- [x] Set GitHub secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
- [x] Push Docker images to GHCR (private); ACA pulls via registry credential (PAT `read:packages`)
- [x] Deploy all 5 services to ACA — api-gateway public, 4 services internal-only
- [x] Create `ocelot.Production.json` with ACA internal FQDNs (`*.internal.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io`)
- [x] Set all runtime secrets in ACA secret store (`secretref:`) — never in git or GitHub secrets
- [x] Wire `az containerapp update --image` deploy step into all 5 GitHub Actions workflows
- [x] End-to-end verified: `GET /health` → 200, `GET /api/v1/search` → real Supabase data
- [x] Add per-route rate limiting to `ocelot.Production.json` — protect OpenAI, booking, admin writes, comments
- [x] Wire CI/CD deploy step for cron-jobs Lambda (`dotnet lambda deploy-function`)
- [x] Register EventBridge nightly rule for Lambda cron job — deployed Phase 9
- [x] Deploy frontends to Vercel + set `NEXT_PUBLIC_API_URL` to api-gateway ACA URL
- [x] Update gateway CORS: `Cors__AllowedOrigins` with both Vercel production URLs
- [x] Wire Cognito auth into `client` frontend (real `InitiateAuth`, ID token)
- [x] Wire Cognito auth into `admin-client` frontend (real `InitiateAuth`, Admin group guard)

---

## Phase 7 — Frontends

### client (user-facing)
- [x] Sign in / sign up pages — mock auth (Cognito wiring deferred to Phase 6)
- [x] Search page — destination, dates, guest count with `+/-` guest control
- [x] Search results — horizontal hotel cards, sidebar filters (price, stars, property type)
- [x] Member discount — 15% applied in search results and booking modal when signed in
- [x] "Show on Map" feature — hotel pins on placeholder map with hover tooltips
- [x] Hotel detail page — hero image, two-column layout, rooms tab, reviews tab with category bars
- [x] Booking flow — modal with hero image, date summary, itemised price breakdown, confirmation toast
- [x] AI chat window — floating widget, indigo gradient header, bouncing-dot thinking indicator
- [x] In-app notifications panel — right-slide drawer, unread badge, mark-all-as-read
- [x] Transparent header on landing, solid on scroll; numeric unread badge
- [x] Full landing page — hero, featured cities grid, value-props section, footer
- [x] Frontend redesigned to match CLAUDE-DESIGN spec (`/CLAUDE-DESIGN/design_handoff_stayease`)

### admin-client
- [x] Real Cognito auth — `InitiateAuth`, Admin group check, localStorage token persistence
- [x] Hotel list + create / edit / delete — paginated table, HotelModal, ConfirmDialog
- [x] Room management — add / edit / delete rooms (RoomModal, cascade guard 409 if reservations)
- [x] Availability management — add / delete availability windows (guard on ReservedCount > 0)
- [x] Hotel image gallery — multi-image upload with category titles (room-interior, lobby, pool, etc.), delete UI

---

---

## Phase 9 — Lambda, Notification E2E, Bug Fixes (2026-05-18)

### 9a — Lambda + EventBridge
- [x] Fix `aws-lambda-tools-defaults.json` runtime: `dotnet9` → `dotnet10` (AWS Lambda skips .NET 9)
- [x] Upgrade `cron-jobs` target framework `net9.0` → `net10.0`; update CI workflow
- [x] Create IAM execution role `lambda-capacity-checker-role` (AWSLambdaBasicExecutionRole)
- [x] Deploy `CapacityCheckerFunction` via `dotnet lambda deploy-function` — us-east-1, 512MB, 60s
- [x] Set Lambda env vars: `SUPABASE_CONNECTION_STRING`, `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`
- [x] Create EventBridge rule `nightly-capacity-check` — `cron(0 1 * * ? *)`
- [x] Wire Lambda as target + grant `lambda:InvokeFunction` permission
- [x] Manual test invoke — "0 alert(s) sent", 2168ms, CloudWatch logs verified
- [x] Set GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `LAMBDA_EXECUTION_ROLE_ARN`

### 9b — Notification E2E + Bug Fixes
- [x] **BUG FIX:** Queue name mismatch — `notification-service` listened on `booking.events`, hotel-service published to `booking-events`
- [x] **BUG FIX:** JWT `sub` claim remapping — added `MapInboundClaims = false` to `AddJwtBearer` in hotel-service + comments-service
- [x] **BUG FIX:** Consumer crash loop on email failure — isolated email try-catch so in-app notification always writes
- [x] **BUG FIX:** Access token sent instead of ID token — `auth-context.tsx` `setToken(accessToken)` → `setToken(idToken)` (access token has no `email` claim)
- [x] Set `notification-service --min-replicas 1` (background RabbitMQ worker cannot scale to zero)
- [x] End-to-end verified: book → RabbitMQ → Resend email (200) + Supabase Notifications row written + in-app panel shows notification

---

## Phase 10 — Remaining Work

### 10a — Bug Fixes (Next)
- [ ] **Image upload 500** — admin image upload broken; likely Ocelot multipart forwarding or wrong Content-Type in frontend FormData
- [ ] **Lambda AdminEmail** — test hotel has empty `AdminEmail`; capacity alerts never fire; also `InsertNotificationAsync` sets `UserId = AdminEmail` (should be Cognito `sub`)

### 10b — Frontend Features
- [ ] My Bookings page — list user reservations (hotel name, dates, price, status)
- [ ] My Account page — display profile info (name, email from Cognito JWT claims)
- [ ] Show on Map — strictly required by course spec; hotel pins on interactive map
- [ ] Member discount badge — show original + discounted price in search results when signed in
- [ ] Error toasts + loading states + skeleton screens across all flows
- [ ] General polish — make it feel like a complete website

### 10c — Architecture Cleanup
- [ ] Repository layer — move all DB calls from service classes into dedicated repository classes
- [ ] Custom typed exceptions — e.g. `RoomNotAvailableException`, `HotelNotFoundException` instead of `InvalidOperationException`
- [ ] Input validation — backend DTO validation (FluentValidation or DataAnnotations); frontend form validation

### 10d — Final Deliverables
- [ ] `docker-compose.yml` — remove obsolete `version: "3.9"` line
- [ ] Full end-to-end smoke test (all flows)
- [ ] `README.md` — live URLs, architecture diagram, ER diagrams, assumptions, known issues
- [ ] 5-minute demo video recorded and linked
