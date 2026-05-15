# cron-jobs (AWS Lambda)

Nightly capacity checker. Triggered by Amazon EventBridge on a schedule. Queries Supabase for low-capacity rooms and alerts hotel administrators via Resend.

---

## Responsibility

- Query all `RoomAvailability` rows where the period overlaps the next calendar month
- For each room availability window where `(TotalCapacity - ReservedCount) / TotalCapacity < 0.20`, send an alert email to the hotel administrator via Resend
- Write an alert row to the Supabase `Notifications` table for in-app visibility

---

## Trigger

Amazon EventBridge rule on a `cron(0 1 * * ? *)` expression (01:00 UTC nightly).
The EventBridge rule targets this Lambda function directly.

---

## Data Access

Direct Npgsql connection to Supabase PostgreSQL. No EF Core — plain SQL query for simplicity in Lambda cold-start budget.

Query logic:

```sql
SELECT ra.*, r.RoomType, h.Name AS HotelName, h.AdminEmail
FROM RoomAvailability ra
JOIN Rooms r ON r.Id = ra.RoomId
JOIN Hotels h ON h.Id = r.HotelId
WHERE ra.StartDate <= @nextMonthEnd
  AND ra.EndDate   >= @nextMonthStart
  AND ra.TotalCapacity > 0
  AND (ra.TotalCapacity - ra.ReservedCount)::float / ra.TotalCapacity < 0.20
```

`@nextMonthStart` and `@nextMonthEnd` are computed from `DateTime.UtcNow`.

---

## Alert Flow

For each low-capacity row:
1. Send email to hotel admin (`Hotels.AdminEmail`) via Resend
2. Insert a row in `Notifications` table (`UserId = admin's Cognito sub`, title = "Low Capacity Alert")

---

## Dependencies

| Dependency | Purpose |
|---|---|
| Supabase PostgreSQL | Read `RoomAvailability`, `Rooms`, `Hotels`; write `Notifications` |
| Resend | Send capacity alert emails to hotel admins |
| AWS EventBridge | Schedule trigger (nightly) |

---

## Configuration (Lambda environment variables)

| Key | Notes |
|---|---|
| `ConnectionStrings__Postgres` | Supabase connection string (double underscore for Lambda env var) |
| `Resend__ApiKey` | Resend API key |

---

## Notes on Hotels table

The current `Hotels` schema (`/docs/4_Data_Models.md`) does not include `AdminEmail`.
This field needs to be added to the `Hotels` model and EF Core migration before this Lambda can run.
Documented assumption: hotel admins are identified by a stored email, not resolved through Cognito.

---

## Implementation Plan

1. **Done** — Lambda project scaffold (`CapacityCheckerFunction.csproj` with `Npgsql` and `Amazon.Lambda.Core`)
2. **Next** — Add `AdminEmail` field to `Hotels` model and create EF Core migration in hotel-service
3. **Next** — Implement `Function.cs`:
   - Open Npgsql connection
   - Run capacity query for next month
   - For each result: call Resend API + insert `Notifications` row
4. **Next** — Register EventBridge rule (daily cron) pointing to deployed Lambda ARN
5. **Pending** — Test locally with `dotnet lambda invoke-local`
