# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of Truth

All architectural decisions, constraints, and business rules live in `/docs`. Read these before making any implementation decisions:
- `0_Project_Definition_and_Scope.md` — functional requirements + official course constraints
- `1_Architecture_and_Stack.md` — tech stack, service map, strict constraints
- `2_Business_Requirements.md` — business rules including booking transaction flow
- `3_Deployment_and_DevOps.md` — deployment targets, free tier risk table, CI/CD strategy
- `4_Data_Models.md` — all DB schemas + documented assumptions

## Monorepo Structure

```
/src
  /api-gateway          .NET 9 Ocelot reverse proxy
  /hotel-service        .NET 9 Web API — Admin, Search, Booking
  /comments-service     .NET 9 Web API — MongoDB only
  /notification-service .NET 9 Web API — RabbitMQ consumer + Resend email
  /ai-agent-service     .NET 9 Web API — OpenAI GPT-4o-mini orchestration
  /cron-jobs            AWS Lambda (.NET 9) — nightly capacity checker
  /client               Next.js (React) — user app: search + book
  /admin-client         Next.js (React) — admin panel: hotel/room management
/.github/workflows      Per-service CI/CD with path filtering
```

## Common Commands

### .NET Services (run from inside each service folder)
```bash
dotnet build
dotnet run
dotnet test
dotnet test --filter "FullyQualifiedName~ClassName.MethodName"   # single test
dotnet add package <PackageName>
```

### Frontend (run from inside each client folder)
```bash
cd src/client          # or src/admin-client
npm install
npm run dev
npm run build
```

### Local Dev (all services together)
```bash
docker-compose up         # starts Postgres, MongoDB, Redis, RabbitMQ locally
docker-compose down -v    # tear down + remove volumes
```

### Lambda (cron-jobs)
```bash
cd src/cron-jobs
dotnet lambda package     # requires Amazon.Lambda.Tools
```

## Architecture Rules (Non-Negotiable)

These override any default patterns:

1. **Controllers are thin.** No business logic in controllers. Service/Application layer only.
2. **No SQLite.** Supabase (PostgreSQL) for relational data.
3. **No custom auth.** AWS Cognito JWTs only. Validated at the Ocelot gateway; downstream services extract the `sub` claim from forwarded headers.
4. **MongoDB Atlas is exclusively for `comments-service`.** No other service touches it.
5. **Every service under `/src/` must have a `Dockerfile`.** No exceptions.
6. **OpenAI API key never leaves `ai-agent-service`.** Frontend calls `ai-agent-service`, never OpenAI directly.
7. **Booking uses `SELECT FOR UPDATE`.** The `RoomAvailability` row must be locked within a PostgreSQL transaction. Publish to RabbitMQ only after successful commit.
8. **`IsVacant` is system-managed on booking** (auto-set to `false` when `ReservedCount >= TotalCapacity`) and admin-managed otherwise.
9. **15% discount is server-side.** Applied in `hotel-service` search when a valid Cognito JWT is present in the request.
10. **All APIs are versioned** (`/api/v1/...`) and support pagination.

## Key Technology Choices & Why

| Decision | Choice | Reason |
|---|---|---|
| Auth | AWS Cognito | Learning purposes; Supabase Auth is documented fallback |
| Email | Resend | SES sandbox friction; SNS is wrong tool for transactional email |
| In-app notifications | Supabase `Notifications` table | No extra service needed |
| Cache | Upstash Redis | Serverless, free tier, works with Cloud Run |
| Queue | CloudAMQP (RabbitMQ) | Free tier, managed, no ops overhead |
| AI model | GPT-4o-mini | Handles function calling; negligible cost vs GPT-4o |
| Scheduler | AWS Lambda + EventBridge | Cloud scheduler — any cloud scheduler is acceptable per course |

## CI/CD Pattern

Each service has its own workflow file triggered by path filtering:
```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/hotel-service/**'
```
Changing one service only deploys that service. Docs changes deploy nothing.

## Frontend Map Pattern

`react-leaflet` requires `window` and crashes during SSR. Every Leaflet component must be loaded with a dynamic import:

```ts
const HotelMap = dynamic(
  () => import('@/components/HotelMap').then(m => m.HotelMap),
  { ssr: false }
)
```

`Hotel.LocationPoint` is a plain-text field (`"Istanbul, Turkey"`) used only for keyword search (`LIKE '%Istanbul%'`). It is **not** parsed as coordinates. `Hotel.Latitude` / `Hotel.Longitude` are separate nullable `double` columns used exclusively for map pin rendering. Both fields are exposed on `SearchResultItem` so the map has coordinates without an extra API call.

## Data Flow Summary

```
# Synchronous
Client → Ocelot (JWT validation) → Microservice (REST)

# Booking
POST /book → SELECT FOR UPDATE → decrement ReservedCount → INSERT Reservation → COMMIT → publish RabbitMQ event

# Async notification
RabbitMQ event → notification-service → Resend email + INSERT Notifications row

# Nightly job
EventBridge (nightly) → Lambda → check RoomAvailability → alert if capacity < 20% for next month

# AI Agent
Frontend → ai-agent-service (holds OpenAI key + user JWT) → OpenAI tool call → hotel-service Search/Book APIs
```
