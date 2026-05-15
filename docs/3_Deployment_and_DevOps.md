# Deployment and DevOps Strategy

## 1. Repository Structure (Monorepo)
The project is maintained in a single public GitHub repository, separated by folders:
- `/src/api-gateway`         → Ocelot Gateway
- `/src/hotel-service`       → Hotel Admin, Search, Booking
- `/src/comments-service`    → MongoDB-backed comments
- `/src/notification-service`→ RabbitMQ consumer + Resend email + Supabase notifications
- `/src/cron-jobs`           → AWS Lambda nightly capacity checker
- `/src/ai-agent-service`    → OpenAI GPT-4o-mini orchestration + tool calling
- `/src/frontend-client`     → Next.js/React UI

## 2. Deployment Map
| Service | Platform |
|---|---|
| Frontend / UI | Vercel |
| API Gateway (Ocelot) | Google Cloud Run or Azure App Services |
| `hotel-service` | Google Cloud Run or Azure App Services |
| `comments-service` | Google Cloud Run or Azure App Services |
| `notification-service` | Google Cloud Run or Azure App Services |
| `ai-agent-service` | Google Cloud Run or Azure App Services |
| Nightly Job | AWS Lambda + Amazon EventBridge |
| RabbitMQ | CloudAMQP (free tier) |
| Redis Cache | Upstash (serverless free tier) |
| Relational DB | Supabase (PostgreSQL) |
| NoSQL DB | MongoDB Atlas (free tier) |
| Email | Resend (free tier) |
| IAM | AWS Cognito |

## 3. CI/CD Principles
- Deployments use path filtering (GitHub Actions `paths` trigger).
- Modifying `/src/hotel-service` only triggers the build and deploy pipeline for `hotel-service`.
- Do not push or store large built Docker images in the repository.
- Every service under `/src/` must have a `Dockerfile` at its root.

## 4. Free Tier Risk Notes
| Provider | Limit | Risk |
|---|---|---|
| Upstash Redis | 10,000 commands/day | Medium — monitor during heavy testing |
| CloudAMQP | 1M messages/month | Low |
| MongoDB Atlas | 512MB storage | Low |
| Supabase | 500MB DB, 2GB bandwidth | Low |
| Resend | 3,000 emails/month | Low |
| OpenAI GPT-4o-mini | Pay-as-you-go (~$0.0001/conversation) | Low — set hard cap in dashboard |
