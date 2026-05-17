# Implementation Overview

Source of truth for implementation phases, service wiring, and deployment architecture.
Detailed TODO items live in `TODO_ADMIN_AND_DEPLOY.md`. Current status lives in `STATUS.md`.

---

## Implementation Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Monorepo scaffold, Dockerfiles, CI (build + test), EF Core models | Done |
| 2 | `Program.cs` DI wiring, `appsettings` config structure for all services | Done |
| 3 | All service skeletons — controllers, interfaces, RabbitMQ consumer | Done |
| 4 | hotel-service: admin CRUD, search (Redis cache + 15% discount), booking (SELECT FOR UPDATE), notifications | Done |
| 4b | hotel-service unit tests — 30/30 passing in CI | Done |
| 5 | comments-service, notification-service, ai-agent-service, cron-jobs implementations | Done |
| 6a | Local dev: docker-compose, credentials wired, end-to-end verified locally | Done |
| 6b | Azure ACA deployment + CD pipeline (OIDC, GHCR, 5 services) | Done |
| 7a | client (Next.js): search, hotel detail, booking modal, notifications, AI chat | Built, not deployed |
| 7b | admin-client (Next.js): hotel/room/availability CRUD, login | Built, not deployed |
| 8 | Vercel deployment, Cognito wiring, real auth in both frontends | In progress |
| 9 | Admin missing features: room delete, image upload | Pending |
| 10 | End-to-end verification: booking → email, AI chat, 15% discount | Pending |
| 11 | Final deliverables: README, live URLs, architecture diagram, demo video | Pending |

---

## Deployment Architecture

```
  Vercel (client)          Vercel (admin-client)
       │                          │
       └──────────┬───────────────┘
                  │ HTTPS
        ┌─────────▼────────────────────────────────────┐
        │   api-gateway  (Azure Container Apps)         │
        │   Ocelot — JWT validated here (Cognito JWKS)  │
        │   External ingress, port 8080                 │
        └──┬────────────┬─────────────┬────────────────┘
           │ HTTPS:443  │ HTTPS:443   │ HTTPS:443
   ┌───────▼──┐  ┌──────▼────┐  ┌────▼──────────────────┐
   │hotel-svc │  │comments   │  │ai-agent-service        │
   │(internal)│  │-svc       │  │(internal)              │──► OpenAI API
   │          │  │(internal) │  │                        │──► hotel-service
   │Supabase  │  │MongoDB    │  └───────────────────────-┘
   │Upstash   │  │Atlas      │
   │Redis     │  └───────────┘
   └────┬─────┘
        │ publish (AMQP over TLS)
   ┌────▼──────────────┐      ┌──────────────────────┐
   │  CloudAMQP        │      │  cron-jobs            │
   │  RabbitMQ         │      │  AWS Lambda           │
   └────┬──────────────┘      │  EventBridge (nightly)│
        │ consume              └──────────────────────┘
   ┌────▼──────────────┐
   │notification-svc   │──► Resend email
   │(internal)         │──► Supabase PG (Notifications table)
   └───────────────────┘
```

Internal service communication uses ACA's internal DNS:
`<app-name>.internal.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io:443`

---

## Service Wiring

| Caller | Target | Protocol | Purpose |
|---|---|---|---|
| Frontend | api-gateway | HTTPS | All user-facing requests |
| api-gateway | hotel-service | HTTPS (internal) | Admin, Search, Booking, Notifications |
| api-gateway | comments-service | HTTPS (internal) | Comments read/write |
| api-gateway | ai-agent-service | HTTPS (internal) | Chat |
| ai-agent-service | hotel-service | HTTPS (internal) | OpenAI tool calls (search, book) |
| hotel-service | Supabase PostgreSQL | TCP (session pooler) | All relational data |
| hotel-service | Upstash Redis | TCP (TLS) | Hotel detail cache |
| hotel-service | CloudAMQP RabbitMQ | AMQP publish (TLS) | After confirmed booking |
| notification-service | CloudAMQP RabbitMQ | AMQP consume (TLS) | Background listener |
| notification-service | Resend | HTTPS | Booking confirmation email |
| notification-service | Supabase PostgreSQL | TCP (session pooler) | Write in-app notification row |
| cron-jobs (Lambda) | Supabase PostgreSQL | TCP | Nightly capacity read |
| cron-jobs (Lambda) | Resend | HTTPS | Capacity alert email |
| All services | AWS Cognito JWKS | HTTPS | JWT signature validation |

---

## Deployment Targets

| Service | Platform | CI/CD path filter |
|---|---|---|
| `api-gateway` | Azure Container Apps (external) | `src/api-gateway/**` |
| `hotel-service` | Azure Container Apps (internal) | `src/hotel-service/**` |
| `comments-service` | Azure Container Apps (internal) | `src/comments-service/**` |
| `notification-service` | Azure Container Apps (internal) | `src/notification-service/**` |
| `ai-agent-service` | Azure Container Apps (internal) | `src/ai-agent-service/**` |
| `cron-jobs` | AWS Lambda + EventBridge | `src/cron-jobs/**` |
| `client` | Vercel | `src/client/**` |
| `admin-client` | Vercel | `src/admin-client/**` |

Each service has its own workflow in `.github/workflows/` — changing one service only deploys that service.

---

## Secrets Management

All runtime secrets are injected at runtime — never committed to the repository or baked into images.

| Layer | Mechanism |
|---|---|
| .NET services (ACA) | ACA built-in secret store → env vars via `secretref:` |
| GitHub Actions → Azure | OIDC federated identity (no stored credentials) |
| Frontends | Vercel environment variables (non-secret config only) |
| Local dev | `.env` at repo root (gitignored) |
