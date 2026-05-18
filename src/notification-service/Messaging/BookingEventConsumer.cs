using System.Text;
using System.Text.Json;
using NotificationService.Services;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace NotificationService.Messaging;

public class BookingEventConsumer(
    IConnection rabbitConnection,
    IServiceScopeFactory scopeFactory,
    ILogger<BookingEventConsumer> logger) : BackgroundService
{
    private const string QueueName = "booking-events";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var channel = await rabbitConnection.CreateChannelAsync(cancellationToken: stoppingToken);

        await channel.QueueDeclareAsync(
            queue: QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);

        consumer.ReceivedAsync += async (_, ea) =>
        {
            try
            {
                var json = Encoding.UTF8.GetString(ea.Body.Span);
                var evt = JsonSerializer.Deserialize<BookingEvent>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (evt is null) return;

                using var scope = scopeFactory.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                var notificationWriter = scope.ServiceProvider.GetRequiredService<INotificationWriter>();

                try
                {
                    await emailService.SendBookingConfirmationAsync(
                        evt.UserEmail, evt.HotelName, evt.RoomType,
                        evt.CheckIn, evt.CheckOut, evt.PricePaid);
                }
                catch (Exception emailEx)
                {
                    logger.LogWarning(emailEx, "Email delivery failed for {Email} — in-app notification will still be written", evt.UserEmail);
                }

                await notificationWriter.WriteAsync(
                    evt.UserId,
                    "Booking Confirmed",
                    $"Your booking at {evt.HotelName} ({evt.RoomType}) " +
                    $"from {evt.CheckIn} to {evt.CheckOut} is confirmed. " +
                    $"Price paid: {evt.PricePaid:C}.");

                await channel.BasicAckAsync(ea.DeliveryTag, multiple: false);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process booking event");
                await channel.BasicNackAsync(ea.DeliveryTag, multiple: false, requeue: true);
            }
        };

        await channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer);
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
