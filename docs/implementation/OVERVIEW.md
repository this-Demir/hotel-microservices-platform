# Implementation Overview

Source of truth for implementation phases, service wiring, and deployment strategy.
Per-service detail lives in `src/<service>/docs/README.md`.

---

## Implementation Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Monorepo scaffold, Dockerfiles, CI/CD, EF Core models, hotel-service skeleton | Done |
| 2 | `Program.cs` DI wiring for all services | Done |
| 3 | Service skeletons — interfaces, models, controllers, RabbitMQ consumer | Done |
| 4 | `hotel-service` business logic — admin, search (Redis + discount), booking (SELECT FOR UPDATE), notifications | Next |
| 5 | `comments-service`, `notification-service`, `ai-agent-service` implementations | Pending |
| 6 | EF Core migrations, cloud secrets, CI/CD deploy wiring | Pending |
| 7 | Frontends — `client` (search, map, booking, AI chat) + `admin-client` | Pending |

---

## Deployment Diagram

```
  Vercel (client)          Vercel (admin-client)
       │                          │
       └──────────┬───────────────┘
                  │ HTTPS
        ┌─────────▼──────────┐
        │   api-gateway       │  ← JWT validated here (Cognito JWKS)
        │   Ocelot            │    All traffic enters through this
        │   Cloud Run         │
        └──┬──────┬──────┬───┘
           │      │      │
    ┌──────▼──┐ ┌─▼────┐ ┌▼───────────────┐
    │hotel-svc│ │cmmnts│ │ai-agent-service │──► OpenAI API
    │Cloud Run│ │-svc  │ │Cloud Run        │──► hotel-service (tool calls)
    │         │ │Cloud │ └────────────────-┘
    │Supabase │ │Run   │
    │Upstash  │ │Mongo │
    │Redis    │ │Atlas │
    └────┬────┘ └──────┘
         │ publish (AMQP)
    ┌────▼──────────┐
    │  CloudAMQP    │
    │  RabbitMQ     │
    └────┬──────────┘
         │ consume
    ┌────▼──────────┐       ┌──────────────────┐
    │notification   │       │  cron-jobs        │
    │-service       │       │  AWS Lambda       │
    │Cloud Run      │       │  EventBridge      │
    │Resend email   │       │  (nightly)        │
    │Supabase PG    │       │  Supabase + Resend│
    └───────────────┘       └──────────────────┘
```

---

## Service Wiring

| Caller | Target | Protocol | Purpose |
|---|---|---|---|
| Frontend | api-gateway | HTTPS | All user-facing requests |
| api-gateway | hotel-service | HTTP | Admin, Search, Booking, Notifications |
| api-gateway | comments-service | HTTP | Comments read/write |
| api-gateway | ai-agent-service | HTTP | Chat |
| ai-agent-service | hotel-service | HTTP | OpenAI tool calls (search, book) |
| hotel-service | Supabase PostgreSQL | TCP | All relational data |
| hotel-service | Upstash Redis | TCP | Hotel detail cache |
| hotel-service | CloudAMQP RabbitMQ | AMQP publish | After confirmed booking |
| notification-service | CloudAMQP RabbitMQ | AMQP consume | Background listener |
| notification-service | Resend | HTTPS | Booking confirmation email |
| notification-service | Supabase PostgreSQL | TCP | Write in-app notification row |
| cron-jobs (Lambda) | Supabase PostgreSQL | TCP | Nightly capacity read |
| cron-jobs (Lambda) | Resend | HTTPS | Capacity alert email |
| All services | AWS Cognito JWKS | HTTPS | JWT signature validation |

---

## Deployment Targets

| Service | Platform | CI/CD path filter |
|---|---|---|
| `api-gateway` | Cloud Run or Azure App Services | `src/api-gateway/**` |
| `hotel-service` | Cloud Run or Azure App Services | `src/hotel-service/**` |
| `comments-service` | Cloud Run or Azure App Services | `src/comments-service/**` |
| `notification-service` | Cloud Run or Azure App Services | `src/notification-service/**` |
| `ai-agent-service` | Cloud Run or Azure App Services | `src/ai-agent-service/**` |
| `cron-jobs` | AWS Lambda + EventBridge | `src/cron-jobs/**` |
| `client` | Vercel | `src/client/**` |
| `admin-client` | Vercel | `src/admin-client/**` |

Changing one service only deploys that service. Each service has its own workflow in `.github/workflows/`.

---

## Secrets / Environment Variables (by service)

All secrets are injected at runtime via platform environment variables or Secret Manager.
Never committed to the repository. See each service's `docs/README.md` for the full list.
