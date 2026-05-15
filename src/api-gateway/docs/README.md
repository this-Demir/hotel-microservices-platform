# api-gateway

Ocelot reverse proxy. Single entry point for all client traffic. Validates JWTs before forwarding.

---

## Responsibility

- Route incoming requests to the correct downstream service
- Validate AWS Cognito JWTs on protected routes
- Strip/forward `Authorization` header to downstream services (Ocelot default behavior)

No business logic lives here.

---

## Route Table

| Upstream path | Method | Auth required | Downstream service |
|---|---|---|---|
| `/api/v1/admin/{everything}` | GET, POST, PUT, DELETE | Yes | hotel-service :5100 |
| `/api/v1/search` | GET | No | hotel-service :5100 |
| `/api/v1/bookings/{everything}` | GET, POST | Yes | hotel-service :5100 |
| `/api/v1/notifications/{everything}` | GET, PUT | Yes | hotel-service :5100 |
| `/api/v1/comments/{hotelId}` | GET | No | comments-service :5101 |
| `/api/v1/comments` | POST | Yes | comments-service :5101 |
| `/api/v1/agent/{everything}` | POST | Yes | ai-agent-service :5102 |

Routes are defined in `ocelot.json`. Downstream ports are local dev values — override via env vars in cloud.

---

## Dependencies

| Dependency | Purpose |
|---|---|
| AWS Cognito JWKS endpoint | JWT signature validation |
| hotel-service | Downstream for hotel/search/booking/notifications |
| comments-service | Downstream for comments |
| ai-agent-service | Downstream for AI chat |

---

## Configuration

| Key | Example | Notes |
|---|---|---|
| `Cognito:Authority` | `https://cognito-idp.eu-west-1.amazonaws.com/{poolId}` | JWKS fetched automatically |

Downstream host/port in `ocelot.json` — override with `ocelot.Production.json` or env substitution in cloud.

---

## Implementation Plan

1. **Done** — Ocelot + JWT Bearer wired in `Program.cs`
2. **Done** — `ocelot.json` routes defined for all services
3. **Pending** — Create `ocelot.Production.json` with Cloud Run / App Service URLs for each downstream service
4. **Pending** — Add CORS policy for Vercel frontend origins
5. **Pending** — Wire CI/CD deploy step (Cloud Run or Azure App Services)
