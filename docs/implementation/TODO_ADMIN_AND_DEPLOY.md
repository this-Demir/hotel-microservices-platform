# Admin Flow & Deploy Readiness — TODO

Ordered by priority. Items marked **BLOCKER** must be done before any real traffic.
Items marked **NICE** are improvements that don't block deployment.

Legend: ✅ Done | ⏳ Pending | 🔜 Next session

---

## 1. Auth — BLOCKER for all admin operations

### ✅ 1a. Replace mock login with real Cognito `InitiateAuth`
**Status:** Pending — still using fake base64 token in `src/admin-client/lib/auth-context.tsx`.
Will be tackled in the Cognito session (after Vercel deployment).

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
localStorage.setItem('admin_token', id_token)
```

Add to `admin-client/.env.local` (and Vercel env):
```
NEXT_PUBLIC_COGNITO_CLIENT_ID=<your_app_client_id>
NEXT_PUBLIC_COGNITO_AUTHORITY=https://cognito-idp.<region>.amazonaws.com/<pool_id>
```

### ⏳ 1b. Add token refresh

Cognito `id_token` expires in 1 hour. Store the `refresh_token` and call
`grant_type=refresh_token` on 401 responses from the API.

### ⏳ 1c. Create an admin user in Cognito + configure groups/roles

Go to AWS Console → Cognito → User Pool → Users → Create user.
Set permanent password. Add user to an `Admin` group.
Optionally add a custom `role` attribute and use `[Authorize(Policy = "AdminOnly")]`.

---

## 2. Image Upload — Missing frontend

Backend endpoint fully implemented: `POST /api/v1/admin/hotels/{id}/image`

### ⏳ 2a. Add `uploadHotelImage` to `api.ts`

```ts
export async function uploadHotelImage(id: string, file: File, token?: string) {
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

### ⏳ 2b. Add image upload UI to hotel detail page

**File:** `src/admin-client/app/hotels/[id]/page.tsx`

- Hotel cover image preview (`hotel.imageUrl` or placeholder)
- `<input type="file" accept="image/*">` that calls `uploadHotelImage`
- Client-side validation: only `image/*`, reject > 5 MB

### ⏳ 2c. Show image thumbnail in hotel list

**File:** `src/admin-client/app/hotels/page.tsx` — add small image column.

### ⏳ 2d. Verify Supabase Storage bucket exists

Supabase Dashboard → Storage → create bucket `hotel-images`, public read / service-role write.

---

## 3. Missing CRUD operations

### ⏳ 3a. Room delete — backend

```csharp
[HttpDelete("rooms/{id:guid}")]
public async Task<IActionResult> DeleteRoom(Guid id)
{
    var deleted = await adminService.DeleteRoomAsync(id);
    return deleted ? NoContent() : NotFound();
}
```

Guard: check no active reservations reference this room before deleting.

### ⏳ 3b. Room delete — frontend

**File:** `src/admin-client/app/hotels/[id]/page.tsx`

Delete button next to each room row (use existing `ConfirmDialog`).
Add `deleteRoom(id, token)` to `api.ts`.

### 3c. Room update — NICE (backend + frontend)

`PUT /api/v1/admin/rooms/{id}` — low priority, rooms rarely change after creation.

### 3d. Availability delete — NICE (backend + frontend)

`DELETE /api/v1/admin/availability/{id}` — for cleaning up stale windows.

---

## 4. Backend resilience

### ✅ 4a. RabbitMQ startup retry

Done (commit `3343295`): 5-attempt retry loop in hotel-service and notification-service.
`AutomaticRecoveryEnabled = true` on both.

### ✅ 4b. Health check endpoints

Done (commit `3343295`): `GET /health` on all 5 services.
Gateway uses `app.Use()` middleware before `UseOcelot()` — `app.MapGet()` would be intercepted.

### ✅ 4c. `[Authorize]` double-validation

Intentional defence in depth — no change needed.

---

## 5. Docker / local dev cleanup

### ⏳ 5a. Remove obsolete `version` from docker-compose.yml

**File:** `docker-compose.yml` line 1 — delete `version: "3.9"`.

### ⏳ 5b. Ocelot multipart forwarding (image upload)

Verify `POST /api/v1/admin/hotels/{id}/image` forwards `multipart/form-data` correctly
once real Cognito auth is in place:

```bash
curl -X POST https://api-gateway.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io/api/v1/admin/hotels/{id}/image \
  -H "Authorization: Bearer <real_cognito_token>" \
  -F "file=@/path/to/image.jpg"
```

If 400/500, add an explicit route before the `{everything}` catch-all in `ocelot.Production.json`.

---

## 6. Deployment pipeline

### ✅ 6a. Deploy steps in GitHub Actions workflows

Done (this session). All 5 .NET services have `test → build-and-push → deploy` jobs.
Auth via OIDC federation — no stored credentials.

### ✅ 6b. Azure secrets and GitHub secrets

GitHub secrets set: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
All runtime secrets (DB connections, API keys) are in **ACA built-in secret store** (`secretref:`),
not in GitHub Actions secrets.

### 🔜 6c. Set Vercel environment variables (next session)

For both `client` and `admin-client` Vercel projects:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-gateway.ashycoast-db26d23e.germanywestcentral.azurecontainerapps.io` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito app client ID |
| `NEXT_PUBLIC_COGNITO_AUTHORITY` | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AhVpOfGLE` |

### ⏳ 6d. Update Cognito app client callback URLs

AWS Cognito → App Clients → add Vercel production URLs to allowed callback/sign-out URLs.

### ⏳ 6e. Update CORS in api-gateway (after Vercel URLs are known)

```
az containerapp update -g rg-hotelbooking-prod -n api-gateway --set-env-vars \
  Cors__AllowedOrigins="https://<client>.vercel.app,https://<admin-client>.vercel.app"
```

---

## 7. User client (client app) — remaining gaps

| Gap | File | Notes |
|---|---|---|
| Sign-in/sign-up calls no real auth | `src/client/app/sign-in` | Need Cognito `InitiateAuth` |
| Booking page sends no JWT | `src/client/lib/api.ts` | Pass token in `Authorization` header |
| AI chat page wiring | `src/client/app` | `POST /api/v1/agent/chat` |
| 15% discount not visible in UI | search results | Show original + discounted price when logged in |

---

## Summary — remaining execution order

1. ⏳ Vercel deployment for `client` + `admin-client` (next session)
2. ⏳ Update gateway CORS with Vercel URLs
3. ⏳ Cognito: create admin user, configure groups, set callback URLs
4. ⏳ Replace mock auth in admin-client with real Cognito login
5. ⏳ Wire user client sign-in/booking/AI chat with real Cognito tokens
6. ⏳ Add image upload UI + `api.ts` function
7. ⏳ Add room delete (backend + frontend)
8. ⏳ Verify Ocelot multipart forwarding (image upload through gateway)
9. ⏳ Remove `version` from docker-compose.yml
10. ⏳ Verify Supabase `hotel-images` bucket exists and is public
