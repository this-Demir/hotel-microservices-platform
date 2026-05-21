# Deployment & CI/CD

How code gets from a commit to production, and where each service runs.

## CI/CD Pipeline

Each service has its own GitHub Actions workflow triggered by path filtering. A change to `src/hotel-service/**` only redeploys `hotel-service`.

```mermaid
flowchart LR
    Dev[Developer<br>git push to master]
    GH[GitHub Actions<br>path-filtered workflows]
    Tests[dotnet test<br>xUnit — 30 tests]
    GHCR[GHCR<br>Container Registry]
    ACA[Azure Container Apps<br>Germany West Central]
    Lambda[AWS Lambda<br>us-east-1]
    Vercel[Vercel<br>auto-deploy]

    Dev -->|push| GH
    GH -->|test job| Tests
    Tests -->|pass — gates build| GH
    GH -->|docker build + push| GHCR
    GH -->|az containerapp update| ACA
    GH -->|dotnet lambda deploy-function| Lambda
    GH -->|triggers| Vercel
    GHCR -->|pull on deploy| ACA
```

## Deployment Targets

```mermaid
graph LR
    subgraph Vercel[Vercel]
        Client[client<br>user app]
        AdminClient[admin-client<br>admin panel]
    end

    subgraph ACA[Azure Container Apps]
        Gateway[api-gateway<br>external ingress]
        HotelSvc[hotel-service<br>internal]
        NotifSvc[notification-service<br>internal]
        AiAgent[ai-agent-service<br>internal]
        CommentsSvc[comments-service<br>internal]
    end

    subgraph AWS[AWS]
        Lambda[cron-jobs<br>Lambda + EventBridge]
    end

    Client -->|HTTPS| Gateway
    AdminClient -->|HTTPS| Gateway
    Gateway --> HotelSvc
    Gateway --> CommentsSvc
    Gateway --> AiAgent
    HotelSvc -->|AMQP| NotifSvc
```

### Service Dependencies

| Service | Platform | Dependencies |
|---|---|---|
| client | Vercel | api-gateway |
| admin-client | Vercel | api-gateway |
| api-gateway | Azure Container Apps | AWS Cognito (JWT), internal services |
| hotel-service | Azure Container Apps | Supabase PostgreSQL, Upstash Redis, CloudAMQP RabbitMQ |
| notification-service | Azure Container Apps | CloudAMQP RabbitMQ, Resend, Supabase PostgreSQL |
| comments-service | Azure Container Apps | MongoDB Atlas |
| ai-agent-service | Azure Container Apps | OpenAI API, hotel-service |
| cron-jobs | AWS Lambda + EventBridge | Supabase PostgreSQL, Resend |

## Secrets Management

| Layer | Mechanism |
|---|---|
| .NET services on ACA | ACA secret store → injected as env vars via `secretref:` |
| GitHub Actions → Azure | OIDC federated identity — no stored credentials |
| GitHub Actions → AWS | IAM access key stored as GitHub secret |
| Frontends | Vercel environment variables (public config only) |
| Local dev | `.env` at repo root (gitignored) |
