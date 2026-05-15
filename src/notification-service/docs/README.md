# notification-service

Background consumer service. No public HTTP endpoints. Listens to RabbitMQ, sends emails via Resend, writes in-app notifications to Supabase.

---

## Responsibility

- Consume `BookingEvent` messages from the `booking.events` RabbitMQ queue
- Send booking confirmation email to the user via Resend
- Write a row to the Supabase `Notifications` table for in-app display (polled by the frontend via hotel-service)

---

## No HTTP Routes

This service exposes no API endpoints to the gateway. All work is done by `BookingEventConsumer` (a `BackgroundService`).

---

## Message Flow

```
hotel-service publishes BookingEvent
        │
        ▼
CloudAMQP queue: booking.events
        │
        ▼
BookingEventConsumer.ReceivedAsync
    ├── IEmailService.SendBookingConfirmationAsync  →  Resend API
    └── INotificationWriter.WriteAsync             →  Supabase Notifications table
```

On success: `BasicAck`. On failure: `BasicNack` with requeue.

---

## BookingEvent shape

```csharp
record BookingEvent(
    Guid ReservationId,
    string UserId,
    string UserEmail,
    string HotelName,
    string RoomType,
    DateOnly CheckIn,
    DateOnly CheckOut,
    decimal PricePaid);
```

This must match exactly what `hotel-service` publishes (same JSON property names).

---

## Dependencies

| Dependency | Purpose |
|---|---|
| CloudAMQP RabbitMQ | Source of booking events |
| Resend | Transactional email delivery |
| Supabase PostgreSQL | Write in-app notification row |

---

## Configuration

| Key | Notes |
|---|---|
| `ConnectionStrings:RabbitMQ` | CloudAMQP AMQP URL |
| `ConnectionStrings:Postgres` | Supabase connection string (for NotificationWriter) |
| `Resend:ApiKey` | Resend API key |

---

## Implementation Plan

1. **Done** — `BookingEvent`, `IEmailService`, `INotificationWriter`, `BookingEventConsumer` skeleton
2. **Done** — `BookingEventConsumer` registered as `IHostedService` in `Program.cs`
3. **Next** — `EmailService`: implement using `IResend` client; create booking confirmation email template
4. **Next** — `NotificationWriter`: write to Supabase `Notifications` table via `Npgsql` direct or a minimal `DbContext`
5. **Next** — Register `EmailService` and `NotificationWriter` in `Program.cs`
6. **Pending** — `SendCapacityAlertAsync` is called by cron-jobs Lambda (not by this service) — verify `IEmailService` interface is reusable or duplicate the email logic in cron-jobs
