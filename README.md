# Hotel Booking System

A microservices-based hotel booking platform built with .NET 9 and Next.js.

## Services

| Service | Description | Port |
|---|---|---|
| `api-gateway` | Ocelot reverse proxy — single entry point, JWT validation | 5000 |
| `hotel-service` | Hotel admin CRUD, room search, booking engine | 5001 |
| `comments-service` | Hotel ratings and comments (MongoDB) | 5002 |
| `notification-service` | Email delivery (Resend) and in-app notifications | 5003 |
| `ai-agent-service` | GPT-4o-mini orchestration with tool calling | 5004 |
| `cron-jobs` | AWS Lambda — nightly capacity checker | — |
| `client` | Next.js — user-facing app (search, book) | 3000 |
| `admin-client` | Next.js — admin panel (manage hotels, rooms, availability) | 3001 |

## Tech Stack

- **Backend** — .NET 9 Web API
- **Gateway** — Ocelot
- **Auth** — AWS Cognito (JWT)
- **Database** — Supabase (PostgreSQL) · MongoDB Atlas
- **Cache** — Upstash Redis
- **Queue** — CloudAMQP (RabbitMQ)
- **Email** — Resend
- **AI** — OpenAI GPT-4o-mini
- **Frontend** — Next.js · Tailwind CSS
- **Infra** — Docker · AWS Lambda · GitHub Actions

## Local Development

**Prerequisites:** Docker, .NET 9 SDK, Node 22

```bash
# Start local infrastructure (Postgres, MongoDB, Redis, RabbitMQ)
docker-compose up

# Run a service
cd src/hotel-service
dotnet run

# Run the user client
cd src/client
npm install
npm run dev

# Run the admin client (separate terminal)
cd src/admin-client
npm install
npm run dev -- --port 3001
```

## Project Structure

```
/src
  /api-gateway
  /hotel-service
  /comments-service
  /notification-service
  /ai-agent-service
  /cron-jobs
  /client
  /admin-client
/.github/workflows
/docs
```

## License

[MIT](LICENSE)
