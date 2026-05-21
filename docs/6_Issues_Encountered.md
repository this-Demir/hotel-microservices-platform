# Issues Encountered

All issues discovered and resolved during development. Grouped by area. All are resolved.

> For the full bug list with individual IDs and fix details see [`BUGS.md`](implementation/BUGS.md).
> For the phase-by-phase implementation log including infrastructure decisions see [`implementation/PHASES.md`](implementation/PHASES.md).

---

## 1. Authentication & JWT

**Cognito app client had a secret (unusable from browser)**
The initial Cognito app client was created with a client secret. Browser-based `InitiateAuth` calls require a public client (no secret). A new public app client was created.

**Frontend sent access token instead of ID token**
The auth context stored and forwarded the access token as the Bearer token. The access token does not contain the `email` claim; downstream services and Resend rejected requests with 422. Fixed by storing and forwarding the ID token instead.

**JWT `sub` claim remapped by .NET middleware**
By default, .NET's JWT middleware remaps `sub` to a long claim URI. `FindFirst("sub")` returned null in hotel-service and comments-service. Fixed by setting `MapInboundClaims = false` on `AddJwtBearer`.

**Admin panel fires API call with empty Bearer token (useEffect race)**
The admin panel's data-fetch `useEffect` ran before the auth context had resolved the token. API calls went out with an empty `Authorization` header. Fixed by gating the `useEffect` on the token being non-empty.

---

## 2. API Gateway & Routing

**Ocelot global `ClientIdHeader` blocks public routes**
A `ClientIdHeader` set in Ocelot's `GlobalConfiguration` was applied to all routes including public search endpoints, blocking unauthenticated requests. Removed from `GlobalConfiguration`.

**Missing `GET /api/v1/notifications` route in Ocelot**
The notifications fetch endpoint was not explicitly listed in `ocelot.json` or `ocelot.Production.json`. Added the explicit route to both files.

**Notification mark-read broken (`PATCH` vs `PUT`)**
The `NotificationsController` used `[HttpPatch]` but both frontends and the Ocelot allowed-methods list used `PUT`. Changed the controller attribute to `[HttpPut]`.

**CORS not configured with Vercel URLs**
After deploying frontends to Vercel, API requests were blocked by CORS. The `Cors__AllowedOrigins` environment variable on the api-gateway Azure Container App was updated with both Vercel production URLs.

---

## 3. Cloud Infrastructure & Deployment

**Platform switched mid-project: Google Cloud Run → Azure Container Apps**
Initial deployment target was Google Cloud Run. Switched to Azure Container Apps (Consumption plan, Germany West Central) for easier internal service networking and managed ingress.

**Redis Cloud free tier unavailable (Upstash fallback)**
The original plan used Upstash Redis. Upstash removed its free tier during the project. Switched to Redis Cloud free instance. Connection string format also had to change from a `rediss://` URL to StackExchange.Redis native format (`host:port,password=...`).

**hotel-service cold start → 503 on first request after idle**
With min-replicas set to 0, the first request after an idle period hit a cold start and timed out. Raised `min-replicas` to 1 for hotel-service.

**notification-service must not scale to zero**
The RabbitMQ consumer is a background `IHostedService`. At 0 replicas it cannot listen for messages. Set `min-replicas 1` on the notification-service ACA app.

**Windows Hyper-V excluded port ranges conflicted with `launchSettings.json`**
Some default local ports (e.g., 5000–5004) were reserved by Windows Hyper-V and could not be bound. All `launchSettings.json` ports were moved to the 7000–7004 range.

**Supabase direct connection string broke on IPv4-only environments**
The direct Supabase host requires IPv6. Local and CI environments used IPv4. Switched to the Supabase session pooler URL (`aws-1-ap-northeast-1.pooler.supabase.com`).

**`NEXT_PUBLIC_COGNITO_CLIENT_ID` had a BOM character in Vercel env**
After pasting the Cognito client ID into the Vercel dashboard via CLI, a BOM character was prepended. Cognito rejected all auth requests silently. Re-entered the value manually via the Vercel dashboard.

**Accidental duplicate Vercel project created during CLI linking**
Running `vercel link` without selecting an existing project created a new project. The duplicate was deleted and the correct project was re-linked.

---

## 4. Database & Connectivity

**MongoDB Atlas IP whitelist blocked all connections**
The Atlas cluster had no IP whitelist entries. All requests from ACA returned connection refused. Set the whitelist to `0.0.0.0/0` (allow all) for the hosted environment.

**MongoDB index creation in Scoped constructor caused driver error**
Index creation was called inside a Scoped service constructor. The MongoDB driver threw on concurrent index creation attempts. Moved index creation to a `MongoIndexInitializer : IHostedService` that runs once on startup.

**MongoDB `GuidSerializer` not registered (Driver v3 breaking change)**
Driver v3 changed default GUID serialization. All GUID reads returned deserialization errors. Registered `GuidSerializer(BsonType.String, GuidRepresentation.Standard)` globally.

**Hotel delete hits FK constraint returning 500**
`DELETE /hotels/{id}` succeeded at the HTTP level but the database threw a FK violation because rooms existed. The service now checks for child rooms first and returns 409 with a message.

**Admin image upload returned unhandled 500**
`EnsureSuccessStatusCode()` was called on the Supabase Storage response without reading the error body. When the `hotel-images` bucket didn't exist, it produced an opaque `HttpRequestException`. Fixed by reading the error body on failure, surfacing it in the response, and creating the bucket in the Supabase dashboard.

---

## 5. Messaging & Notifications

**Queue name mismatch between publisher and consumer**
`hotel-service` published events to `booking-events`; `notification-service` consumed from `booking.events`. Messages were published but never consumed. Aligned the queue name in `BookingEventConsumer.cs`.

**Notification consumer crashed on email failure — infinite requeue loop**
If Resend returned an error, the consumer threw an exception and the message was requeued indefinitely. Wrapped the email call in an isolated try-catch so failures log a warning and the message is always ACKed; the in-app notification row is still written.

**Lambda used `AdminEmail` instead of `AdminSub` as `UserId`**
The nightly Lambda inserted notification rows with `UserId = AdminEmail`. The `Notifications` table uses Cognito `sub` as `UserId`, so notifications never matched the admin's session. Added `AdminSub` (nullable text) to the `Hotels` table, applied an EF migration, and updated both `HotelModal.tsx` and `Function.cs`.

**Existing hotels had NULL `AdminSub` after migration**
Hotels seeded before the `AdminSub` migration had `AdminSub = NULL`. Lambda inserted `UserId = ""` for those rows, which matched no admin. Resolved by wiping and reseeding the database via the admin panel so all hotels have `AdminSub` populated from the creating admin's JWT.

---

## 6. Lambda & Scheduler

**AWS Lambda does not support .NET 9**
The Lambda runtime skips .NET 9 (goes from .NET 8 directly to .NET 10). The `cron-jobs` project targeted `net9.0` and the `aws-lambda-tools-defaults.json` specified `dotnet9`. Upgraded to `net10.0` and updated the runtime string and CI workflow accordingly.
