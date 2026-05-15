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

- [ ] `HotelAdminService` — CRUD for Hotels, Rooms, RoomAvailability
- [ ] `SearchService` — filter by destination / dates / guest count
- [ ] `SearchService` — Redis cache-aside for hotel details
- [ ] `SearchService` — 15% discount when JWT present
- [ ] `BookingService` — `SELECT FOR UPDATE` transaction
- [ ] `BookingService` — capacity decrement + `IsVacant` auto-set
- [ ] `BookingService` — publish `BookingEvent` to RabbitMQ after commit
- [ ] `NotificationService` — query `Notifications` table (paginated)
- [ ] `NotificationService` — mark as read
- [ ] Register all concrete services in `hotel-service/Program.cs`
- [ ] Add `AdminEmail` field to `Hotels` model (required by cron-jobs)
- [ ] EF Core migration (`dotnet ef migrations add Init`)
- [ ] Apply migration against Supabase

---

## Phase 5 — Remaining Service Implementations

### comments-service
- [ ] `CommentService.CreateAsync` — insert MongoDB document
- [ ] `CommentService.GetByHotelAsync` — filter + paginate
- [ ] Create MongoDB index on `hotelId`
- [ ] Register `CommentService` in `Program.cs`

### notification-service
- [ ] `EmailService.SendBookingConfirmationAsync` — Resend email template
- [ ] `EmailService.SendCapacityAlertAsync` — Resend alert template
- [ ] `NotificationWriter.WriteAsync` — insert row to Supabase `Notifications`
- [ ] Register `EmailService` and `NotificationWriter` in `Program.cs`

### ai-agent-service
- [ ] `AiAgentService.ChatAsync` — build `ChatCompletionOptions` with tool definitions
- [ ] Tool: `search_hotels` → `GET /api/v1/search` on hotel-service
- [ ] Tool: `book_hotel` → `POST /api/v1/bookings` on hotel-service
- [ ] Handle OpenAI tool call loop (call tool → append result → continue)
- [ ] Forward user JWT on all hotel-service calls
- [ ] Register `AiAgentService` in `Program.cs`

### cron-jobs (Lambda)
- [ ] `Function.cs` — open Npgsql connection
- [ ] Query rooms below 20% capacity for next month
- [ ] Send capacity alert email via Resend for each result
- [ ] Insert `Notifications` row for each alert
- [ ] Register EventBridge rule (nightly cron)

---

## Phase 6 — Cloud Wiring & Secrets

- [ ] Create Supabase project + get connection string
- [ ] Create MongoDB Atlas cluster + get connection string
- [ ] Create Upstash Redis instance + get URL
- [ ] Create CloudAMQP instance + get AMQP URL
- [ ] Create Resend account + get API key
- [ ] Set up AWS Cognito user pool + get Authority URL
- [ ] Set up OpenAI account + billing cap + get API key
- [ ] Add all secrets to GitHub Actions secrets
- [ ] Create `ocelot.Production.json` with Cloud Run / App Services downstream URLs
- [ ] Add CORS policy to `api-gateway` for Vercel frontend origins
- [ ] Wire CI/CD deploy steps for each service (Cloud Run or Azure App Services)
- [ ] Wire CI/CD deploy step for cron-jobs Lambda (`dotnet lambda deploy-function`)

---

## Phase 7 — Frontends

### client (user-facing)
- [ ] Cognito auth flow (sign in / sign up)
- [ ] Search page — destination, dates, guest count
- [ ] Search results — hotel list with prices (discounted when logged in)
- [ ] "Show on Map" feature (required) — render hotel pins on map (Leaflet / OpenStreetMap)
- [ ] Hotel detail page — room list, ratings summary
- [ ] Booking flow — confirm booking, show confirmation
- [ ] AI chat window — `POST /api/v1/agent/chat`, display reply
- [ ] In-app notifications panel — poll `/api/v1/notifications`

### admin-client
- [ ] Cognito auth flow (admin login)
- [ ] Hotel list + create / edit / delete
- [ ] Room management — add rooms to a hotel
- [ ] Availability management — set dates, capacity, vacant status

---

## Phase 8 — Final Deliverables

- [ ] Live deployed URLs (all services + frontends)
- [ ] System architecture diagram in `README.md`
- [ ] ER diagram in `README.md`
- [ ] Assumptions documented
- [ ] Issues encountered documented
- [ ] 5-minute demo video recorded and linked
