# Deployment and DevOps Strategy

## 1. Repository Structure (Monorepo)
The project is maintained in a single GitHub repository: `this-Demir/hotel-microservices-platform`

```
/src
  /api-gateway          → Ocelot Gateway (.NET 9)
  /hotel-service        → Hotel Admin, Search, Booking (.NET 9)
  /comments-service     → MongoDB-backed comments (.NET 9)
  /notification-service → RabbitMQ consumer + Resend email (.NET 9)
  /ai-agent-service     → OpenAI GPT-4o-mini orchestration (.NET 9)
  /cron-jobs            → AWS Lambda nightly capacity checker (.NET 10)
  /client               → Next.js user app (search + book)
  /admin-client         → Next.js admin panel
/.github/workflows      → Per-service CI/CD (path-filtered)
```

## 2. Deployment Map

| Service | Platform | URL / Notes |
|---|---|---|
| api-gateway | Azure Container Apps (external) | `https://api-gateway.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` |
| hotel-service | Azure Container Apps (internal) | `hotel-service.internal.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` |
| comments-service | Azure Container Apps (internal) | `comments-service.internal.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` |
| notification-service | Azure Container Apps (internal) | `notification-service.internal.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` |
| ai-agent-service | Azure Container Apps (internal) | `ai-agent-service.internal.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` |
| cron-jobs | AWS Lambda + Amazon EventBridge | `CapacityCheckerFunction` — us-east-1, dotnet10, nightly `cron(0 1 * * ? *)` |
| client | Vercel (Hobby) | `https://hotel-client-gold.vercel.app` |
| admin-client | Vercel (Hobby) | `https://hotel-admin-client.vercel.app` |
| RabbitMQ | CloudAMQP (free tier) | `sparrow.rmq.cloudamqp.com`, vhost `isenpvss` |
| Redis Cache | Upstash (serverless free tier) | `tooth-bed-plastic-39581.db.redis.io:14377` |
| Relational DB | Supabase (PostgreSQL) | Session pooler, `aws-1-ap-northeast-1.pooler.supabase.com:5432` |
| NoSQL DB | MongoDB Atlas (free tier) | Cluster `hotel-booking`, db `hotel_comments_db` |
| Email | Resend (free tier) | From: `onboarding@resend.dev` |
| IAM | AWS Cognito | Pool `us-east-1_AhVpOfGLE`, region `us-east-1` |
| Object Storage | Supabase Storage | Bucket `hotel-images` |

## 3. Azure Infrastructure

**Subscription:** `850257bd-e306-48eb-afdc-22bf1d1ee1d8` (Azure for Students — free tier)
**Resource group:** `rg-hotelbooking-prod`
**Region:** `germanywestcentral` (West Europe and North Europe blocked by student policy)
**Container Apps Environment:** `cae-hotelbooking` — Consumption profile only (no `--enable-workload-profiles`)
**Log Analytics:** `log-hotelbooking` (30-day retention)

**Free tier budgets (Consumption plan):**
| Resource | Free quota / month |
|---|---|
| vCPU-seconds | 180,000 |
| GiB-seconds | 360,000 |
| Requests | 2,000,000 |

All apps run with `--min-replicas 0 --max-replicas 1` (scale-to-zero) to stay within free quota, **except notification-service which is set to `--min-replicas 1`** — it is a pure RabbitMQ background worker with no HTTP traffic to trigger a scale-up.

## 4. AWS Lambda Infrastructure

**Account:** `714807364884`
**Region:** `us-east-1`
**Function:** `CapacityCheckerFunction`
**Runtime:** `dotnet10` (AWS Lambda skips .NET 9 — managed runtimes are dotnet8 and dotnet10)
**Memory:** 512 MB | **Timeout:** 60s
**Execution role:** `arn:aws:iam::714807364884:role/lambda-capacity-checker-role` (AWSLambdaBasicExecutionRole)

**EventBridge rule:** `nightly-capacity-check`
- Schedule: `cron(0 1 * * ? *)` — fires 01:00 UTC every night
- Target: `CapacityCheckerFunction`

**Lambda environment variables:**
| Key | Purpose |
|---|---|
| `SUPABASE_CONNECTION_STRING` | Direct Npgsql connection to Supabase PostgreSQL |
| `RESEND_API_KEY` | Resend API key for alert emails |
| `NOTIFICATION_FROM_EMAIL` | Sender address (`onboarding@resend.dev`) |

## 6. CI/CD Principles

- **Path filtering:** Each workflow only triggers on changes to its own `src/<service>/**` path.
  Changing hotel-service code will NOT trigger gateway or comments-service pipelines.
- **OIDC authentication:** GitHub Actions authenticates to Azure via federated identity (no stored credentials).
  OIDC subject: `repo:this-Demir/hotel-microservices-platform:ref:refs/heads/master` (case-sensitive).
- **Image registry:** GHCR (private). CI pushes with `GITHUB_TOKEN`; ACA pulls via registry credential.
- **Image naming:** `ghcr.io/this-demir/hotel-microservices-platform/<service>:<sha>` (always lowercase).
- **Job chain:** `test` → `build-and-push` → `deploy` (each job `needs:` the prior one).

### GitHub Secrets Required
| Secret | Value source |
|---|---|
| `AZURE_CLIENT_ID` | OIDC service principal app ID |
| `AZURE_TENANT_ID` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AWS_ACCESS_KEY_ID` | IAM user `Me` access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user `Me` secret key |
| `AWS_REGION` | `us-east-1` |
| `LAMBDA_EXECUTION_ROLE_ARN` | `arn:aws:iam::714807364884:role/lambda-capacity-checker-role` |

### Workflow Files
| File | Service | Test project? |
|---|---|---|
| `api-gateway.yml` | api-gateway | No (build-only CI) |
| `hotel-service.yml` | hotel-service | Yes |
| `comments-service.yml` | comments-service | Yes |
| `notification-service.yml` | notification-service | Yes |
| `ai-agent-service.yml` | ai-agent-service | Yes |
| `client.yml` | Next.js client | Build only |
| `admin-client.yml` | Next.js admin-client | Build only |
| `cron-jobs.yml` | AWS Lambda | dotnet lambda package |

## 7. Ocelot Gateway Routing

In production, the gateway loads `ocelot.Production.json` (file present in `src/api-gateway/`).
This file routes all API traffic to the ACA internal FQDNs via HTTPS on port 443.

| Upstream path | Downstream service |
|---|---|
| `/api/v1/admin/{everything}` | hotel-service (auth required) |
| `/api/v1/search`, `/api/v1/search/{everything}` | hotel-service (public) |
| `/api/v1/bookings/{everything}` | hotel-service (auth required) |
| `/api/v1/notifications/{everything}` | hotel-service (auth required) |
| `/api/v1/comments/{everything}` | comments-service |
| `/api/v1/agent/{everything}` | ai-agent-service (auth required) |

`/health` is handled by a middleware shim in `Program.cs` before Ocelot intercepts it
(because `app.MapGet` is intercepted by Ocelot and never reached).

## 8. Secrets Management

All runtime secrets are stored in **ACA built-in secret store** (`az containerapp secret set`).
They are referenced in env vars via `secretref:<secret-name>` — never plaintext.
No Azure Key Vault (would incur cost). No secrets in git or Docker images.

## 9. Free Tier Risk Notes

| Provider | Limit | Risk | Mitigation |
|---|---|---|---|
| Azure Container Apps | 180k vCPU-s + 360k GiB-s + 2M req/mo | Medium — replicas > 0 blows quota | `--min-replicas 0` on 4 apps; notification-service at 1 (required for RabbitMQ consumer) |
| Upstash Redis | 10,000 commands/day | Medium | Monitor during heavy testing |
| CloudAMQP | 1M messages/month | Low | — |
| MongoDB Atlas | 512MB storage | Low | — |
| Supabase | 500MB DB, 2GB bandwidth | Low | — |
| Resend | 3,000 emails/month | Low | — |
| OpenAI GPT-4o-mini | Pay-as-you-go | Low | Set hard cap in OpenAI dashboard |
