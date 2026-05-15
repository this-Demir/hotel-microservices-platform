# ai-agent-service

OpenAI GPT-4o-mini orchestration layer. Receives chat messages from the frontend, runs tool calls against hotel-service REST APIs, returns a natural-language reply.

---

## Responsibility

- Accept a user chat message via `POST /api/v1/agent/chat`
- Pass the message to GPT-4o-mini with two tool definitions: `search_hotels` and `book_hotel`
- When the model calls a tool, invoke the corresponding hotel-service endpoint — forwarding the user's JWT so the 15% discount and booking identity are preserved
- Return the final model reply to the frontend

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/agent/chat` | Yes | Send a message, receive AI reply |

Request body:
```json
{ "message": "Find me a family room in Istanbul for 2 guests next weekend" }
```

Response:
```json
{ "reply": "I found 3 available rooms... Would you like me to book one?" }
```

Real-time (WebSockets / SignalR) is NOT required. Simple request/response only.

---

## Tool Definitions (OpenAI function calling)

| Tool name | Maps to | hotel-service endpoint |
|---|---|---|
| `search_hotels` | `ISearchService` | `GET /api/v1/search` |
| `book_hotel` | `IBookingService` | `POST /api/v1/bookings` |

The user's JWT is forwarded in the `Authorization` header on every hotel-service call so that:
- Search returns discounted prices (15%)
- Booking records the correct `userId` (Cognito `sub`)

---

## Dependencies

| Dependency | Purpose |
|---|---|
| OpenAI API (GPT-4o-mini) | Chat + tool calling |
| hotel-service | Tool call target |
| AWS Cognito JWKS | Validate inbound JWT from frontend |

The OpenAI API key never leaves this service.

---

## Configuration

| Key | Notes |
|---|---|
| `Cognito:Authority` | Cognito user pool URL |
| `OpenAI:ApiKey` | GPT-4o-mini API key — never exposed to frontend |
| `ServiceUrls:HotelService` | Base URL of hotel-service (e.g., Cloud Run URL in production) |

---

## Implementation Plan

1. **Done** — `AgentDtos`, `IAiAgentService`, `AgentController` skeleton
2. **Done** — `OpenAIClient`, named `HttpClient` for hotel-service, JWT Bearer wired in `Program.cs`
3. **Next** — `AiAgentService`: implement `ChatAsync`
   - Build `ChatCompletionOptions` with two tool definitions
   - Run the OpenAI chat loop (handle `ToolCalls` → invoke hotel-service → append result → continue)
   - Return final assistant message as `ChatResponse.Reply`
4. **Next** — Register `AiAgentService` in `Program.cs`
5. **Pending** — Prompt engineering: system prompt describing the hotel booking context and tool usage rules
