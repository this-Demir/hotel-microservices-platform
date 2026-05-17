# Architecture and Technology Stack

## 1. System Architecture
This system follows a Microservices Architecture pattern. All client requests are routed through a central API Gateway. Microservices communicate synchronously via REST and asynchronously via a Message Broker.

## 2. Technology Stack (Source of Truth)
- **Backend Framework:** .NET 9 Web API
- **API Gateway:** Ocelot (.NET 9)
- **Identity & Access Management (IAM):** AWS Cognito (User Pools)
  - **Fallback (if Cognito setup fails):** Supabase Auth — drop-in replacement, same JWT flow
- **Core Relational Database:** Supabase (PostgreSQL)
- **NoSQL Database:** MongoDB Atlas (Strictly for Comments Service)
- **Distributed Cache:** Redis via **Upstash** (serverless, free tier)
- **Message Broker (Queue):** RabbitMQ via **CloudAMQP** (free tier)
- **Transactional Email:** **Resend** (free tier: 3,000 emails/month, .NET SDK: `Resend`)
- **In-App Notifications:** Supabase `Notifications` table (polled by frontend)
- **Scheduled Tasks (Cron):** AWS Lambda + Amazon EventBridge
- **AI Agent Provider:** OpenAI GPT-4o-mini (function/tool calling)
  - Billing safeguard: hard monthly cap set in OpenAI dashboard
- **Frontend / Client UI:** Vercel (Next.js/React or Vue)

## 3. Services
| Service | Responsibility |
|---|---|
| `api-gateway` | Ocelot reverse proxy, JWT validation, per-route rate limiting, route all traffic |
| `hotel-service` | Hotel Admin CRUD, Search, Booking |
| `comments-service` | Ratings & comments (MongoDB only) |
| `notification-service` | RabbitMQ consumer, email via Resend, in-app via Supabase |
| `cron-jobs` | AWS Lambda — nightly capacity check + admin alert |
| `ai-agent-service` | OpenAI GPT-4o-mini orchestration, tool calling to hotel-service APIs |
| `frontend-client` | Next.js/React UI on Vercel |

## 4. Communication Flow
- **Synchronous:** Client -> Ocelot Gateway (JWT validation + rate limiting) -> Specific Microservice (REST)
- **Asynchronous:** Hotel Service -> RabbitMQ (fire and forget) -> Notification Service
- **AI Agent:** Frontend -> AI Agent Service -> OpenAI (tool calling) -> Hotel Service APIs

## 5. Strict Technical Constraints
- DO NOT use SQLite under any circumstances.
- DO NOT implement a local or custom authentication database. Rely entirely on AWS Cognito tokens.
- Keep Controllers thin. All business logic must reside in the Service/Application layer following clean OOP principles.
- Every backend service must contain a `Dockerfile` at its root level.
- DO NOT expose OpenAI API key to the frontend. All AI orchestration lives in `ai-agent-service`.
- Target `net9.0` in all `.csproj` files.
