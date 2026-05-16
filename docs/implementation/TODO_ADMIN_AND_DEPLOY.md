# Admin Flow & Deploy Readiness — TODO

Ordered by priority. Items marked **BLOCKER** must be done before any real traffic.
Items marked **NICE** are improvements that don't block deployment.

---

## 1. Auth — BLOCKER for all admin operations

The admin-client currently generates a fake base64 token (`btoa(email:timestamp)`).
The api-gateway validates JWTs against Cognito JWKS before forwarding — every admin
API call returns **401** with the current mock token.

### 1a. Replace mock login with real Cognito `InitiateAuth`

**File:** `src/admin-client/lib/auth-context.tsx` — `login()` function

Replace the mock block with a call to the Cognito token endpoint:

```ts
const res = await fetch(
  `https://cognito-idp.{REGION}.amazonaws.com/{POOL_ID}/oauth2/token`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      username: email,
      password,
    }),
  }
)
if (!res.ok) throw new Error('Invalid credentials')
const { access_token, id_token } = await res.json()
localStorage.setItem('admin_token', id_token)   // id_token carries email claim
```

Add to `admin-client/.env.local` (and Vercel env):
```
NEXT_PUBLIC_COGNITO_CLIENT_ID=<your_app_client_id>
NEXT_PUBLIC_COGNITO_AUTHORITY=https://cognito-idp.<region>.amazonaws.com/<pool_id>
```

### 1b. Add token refresh

Cognito `id_token` expires in 1 hour. Store the `refresh_token` in localStorage and
call `grant_type=refresh_token` on 401 responses from the API.

Simplest approach: wrap `api.ts` fetch calls in a helper that retries once with a
refreshed token when the response is 401.

### 1c. Create an admin user in Cognito

Go to AWS Console → Cognito → User Pool → Users → Create user.
Set a permanent password (disable force-change). Use this account to log in.

Optionally add a custom `role` attribute and set it to `admin` — use this in
`AdminController` with `[Authorize(Policy = "AdminOnly")]` for stricter access control.

---

## 2. Image Upload — Missing frontend

Backend endpoint is fully implemented: `POST /api/v1/admin/hotels/{id}/image`
(uploads to Supabase Storage, saves public URL to DB).
The frontend has zero image upload UI.

### 2a. Add `uploadHotelImage` to `api.ts`

```ts
export async function uploadHotelImage(
  id: string,
  file: File,
  token?: string,
): Promise<HotelResponse> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(`${API_URL}/api/v1/admin/hotels/${id}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  })
  if (!res.ok) throw new Error('Image upload failed')
  return res.json()
}
```

### 2b. Add image upload UI to hotel detail page

**File:** `src/admin-client/app/hotels/[id]/page.tsx`

Add below the hotel name/description header:
- A hotel cover image preview (show `hotel.imageUrl` if set, otherwise a placeholder)
- A `<input type="file" accept="image/*">` button that calls `uploadHotelImage`
- Client-side validation: accept only `image/*`, reject files over 5 MB

### 2c. Show image thumbnail in hotel list

**File:** `src/admin-client/app/hotels/page.tsx`

Add a small image column to the hotels table. Render `<img>` if `imageUrl` is set,
otherwise a grey placeholder square.

### 2d. Verify Supabase Storage bucket exists

In Supabase Dashboard → Storage:
- Create bucket named `hotel-images`
- Set policy: **public read**, authenticated write (service role key is used server-side)

---

## 3. Missing CRUD operations

### 3a. Room delete — backend

Add to `AdminController`:
```csharp
[HttpDelete("rooms/{id:guid}")]
public async Task<IActionResult> DeleteRoom(Guid id)
{
    var deleted = await adminService.DeleteRoomAsync(id);
    return deleted ? NoContent() : NotFound();
}
```

Add `DeleteRoomAsync` to `IHotelAdminService` / `HotelAdminService`.
Guard: check no active reservations reference this room before deleting.

### 3b. Room delete — frontend

**File:** `src/admin-client/app/hotels/[id]/page.tsx`

Add a Delete button next to each room row (same pattern as hotel delete — use
`ConfirmDialog` already in the project).
Add `deleteRoom(id, token)` to `api.ts`.

### 3c. Room update — backend + frontend (NICE)

Currently there is no `PUT /api/v1/admin/rooms/{id}`. Add it if price/type
corrections are needed. Low priority since rooms rarely change after creation.

### 3d. Availability delete — backend + frontend (NICE)

No endpoint to remove an availability window. Add
`DELETE /api/v1/admin/availability/{id}` and a delete button in the
availability panel if stale windows need cleaning up.

---

## 4. Backend resilience fixes

### 4a. RabbitMQ startup crash — BLOCKER for notification flow

**File:** `src/hotel-service/Program.cs` (lines 37–44)

`factory.CreateConnectionAsync().GetAwaiter().GetResult()` is called at startup.
If CloudAMQP is unreachable, the service refuses to start (same pattern as the
Redis issue already fixed).

Fix — lazy connect with retry, identical approach to what we did for Redis:
```csharp
builder.Services.AddSingleton<IConnection>(_ =>
{
    var factory = new ConnectionFactory
    {
        Uri = new Uri(builder.Configuration.GetConnectionString("RabbitMQ")!),
        AutomaticRecoveryEnabled = true,
    };
    // Retry up to 5 times with 2s delay (Cloud Run cold start / RabbitMQ restart)
    for (var i = 0; i < 5; i++)
    {
        try { return factory.CreateConnectionAsync().GetAwaiter().GetResult(); }
        catch { Thread.Sleep(2000); }
    }
    return factory.CreateConnectionAsync().GetAwaiter().GetResult();
});
```

Apply the same check to `notification-service` — it consumes from RabbitMQ at startup.

### 4b. Health check endpoints — BLOCKER for Cloud Run

Cloud Run and Azure App Services require a liveness probe endpoint. Without it,
the platform cannot determine whether a container is healthy and will restart it.

Add to every `.NET` service `Program.cs` before `app.Run()`:
```csharp
app.MapGet("/health", () => Results.Ok("healthy"));
```

Services to update: `hotel-service`, `comments-service`, `notification-service`,
`ai-agent-service`, `api-gateway`.

### 4c. `[Authorize]` double-validation

The api-gateway validates the JWT before forwarding. `AdminController` also has
`[Authorize]`, which re-validates inside the service. This is intentional (defence
in depth) but requires that downstream services also have Cognito Authority
configured — which they do. No change needed, just awareness.

---

## 5. Docker / local dev cleanup

### 5a. Remove obsolete `version` from docker-compose.yml

**File:** `docker-compose.yml` line 1

Delete the line `version: "3.9"` — Compose V2 ignores it and emits a warning on
every command.

### 5b. Ocelot image upload route (multipart forwarding)

The current catch-all `"/api/v1/admin/{everything}"` in `ocelot.Docker.json` covers
`POST /api/v1/admin/hotels/{id}/image`. However Ocelot strips request body for some
content types. Verify that `multipart/form-data` forwards correctly once real auth
is in place by testing with `curl`:

```bash
curl -X POST http://localhost:5000/api/v1/admin/hotels/{id}/image \
  -H "Authorization: Bearer <real_cognito_token>" \
  -F "file=@/path/to/image.jpg"
```

If it returns 400/500, add an explicit route for the image upload path before the
`{everything}` catch-all in `ocelot.Docker.json`.

---

## 6. Deployment pipeline — BLOCKER before going live

### 6a. Add deploy steps to GitHub Actions workflows

Each service workflow in `.github/workflows/` currently builds and tests only.
Add a deploy job that:
1. Authenticates with the target platform (GCP or Azure service principal)
2. Pushes the Docker image to the container registry
3. Deploys to Cloud Run / Azure App Services

Minimal Cloud Run example (add after the build job):
```yaml
- name: Authenticate to GCP
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}

- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v2
  with:
    service: hotel-service
    image: gcr.io/${{ secrets.GCP_PROJECT }}/hotel-service:${{ github.sha }}
    region: us-central1
    env_vars: |
      ConnectionStrings__Postgres=${{ secrets.SUPABASE_CONNECTION_STRING }}
      ConnectionStrings__Redis=${{ secrets.REDIS_URL }}
      ...
```

### 6b. Add all secrets to GitHub repository

Go to GitHub → Settings → Secrets → Actions. Add:

| Secret | Used by |
|---|---|
| `SUPABASE_CONNECTION_STRING` | hotel-service, notification-service |
| `SUPABASE_URL` | hotel-service |
| `SUPABASE_SERVICE_ROLE_KEY` | hotel-service |
| `MONGODB_CONNECTION_STRING` | comments-service |
| `REDIS_URL` | hotel-service |
| `RABBITMQ_URL` | hotel-service, notification-service |
| `RESEND_API_KEY` | notification-service |
| `RESEND_FROM_EMAIL` | notification-service |
| `COGNITO_AUTHORITY` | api-gateway, hotel-service, comments-service, ai-agent-service |
| `COGNITO_CLIENT_ID` | api-gateway |
| `OPENAI_API_KEY` | ai-agent-service |
| `GCP_SA_KEY` (or equivalent) | CI deploy |
| `GCP_PROJECT` (or equivalent) | CI deploy |

### 6c. Set Vercel environment variables

For both `client` and `admin-client` Vercel projects:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-gateway-cloud-run-url>` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito app client ID |
| `NEXT_PUBLIC_COGNITO_AUTHORITY` | `https://cognito-idp.<region>.amazonaws.com/<pool_id>` |

### 6d. Update Cognito app client callback URLs

In AWS Cognito → App Clients → your client:
- Add production Vercel URL to allowed callback/sign-out URLs
- Add `https://<admin-client-vercel-url>` as allowed origin

### 6e. Update CORS in api-gateway

**File:** `docker-compose.yml` and Cloud Run env:

```
Cors__AllowedOrigins=https://<client.vercel.app>,https://<admin-client.vercel.app>
```

---

## 7. User client (client app) — remaining gaps

These are not strictly admin items but block the full user flow:

| Gap | File | Notes |
|---|---|---|
| Sign-in/sign-up pages call no real auth | `src/client/app/sign-in` | Need same Cognito `InitiateAuth` wiring as admin-client |
| Booking page sends no JWT | `src/client/lib/api.ts` | Pass stored token in `Authorization` header |
| AI chat page wiring | `src/client/app` | Needs `POST /api/v1/agent/chat` call |
| 15% discount not visible in UI | search results | Show original + discounted price when logged in |

---

## Summary — ordered execution

1. Fix RabbitMQ startup resilience (hotel-service + notification-service)
2. Add `/health` endpoints to all services
3. Remove `version` from docker-compose.yml
4. Replace mock auth in admin-client with real Cognito login
5. Add image upload UI + `api.ts` function
6. Add room delete (backend + frontend)
7. Create Supabase `hotel-images` bucket
8. Verify Ocelot multipart forwarding
9. Add deploy steps to GitHub Actions workflows
10. Add all secrets to GitHub + Vercel
11. Wire user client sign-in/booking with real Cognito tokens
