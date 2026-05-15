using Resend;

namespace NotificationService.Services;

public class EmailService(IResend resend, IConfiguration config) : IEmailService
{
    private readonly string _fromEmail = config["Resend:FromEmail"] ?? "no-reply@example.com";

    public async Task SendBookingConfirmationAsync(
        string toEmail,
        string hotelName,
        string roomType,
        DateOnly checkIn,
        DateOnly checkOut,
        decimal pricePaid)
    {
        var message = new EmailMessage
        {
            From = _fromEmail,
            Subject = $"Booking Confirmed — {hotelName}",
            HtmlBody = $"""
                <h2>Your booking is confirmed!</h2>
                <p><strong>Hotel:</strong> {hotelName}</p>
                <p><strong>Room Type:</strong> {roomType}</p>
                <p><strong>Check-in:</strong> {checkIn:yyyy-MM-dd}</p>
                <p><strong>Check-out:</strong> {checkOut:yyyy-MM-dd}</p>
                <p><strong>Price Paid:</strong> ${pricePaid:F2}</p>
                <p>Thank you for choosing us. Enjoy your stay!</p>
                """,
        };
        message.To.Add(toEmail);
        await resend.EmailSendAsync(message);
    }

    public async Task SendCapacityAlertAsync(
        string adminEmail,
        string hotelName,
        double capacityPercent)
    {
        var message = new EmailMessage
        {
            From = _fromEmail,
            Subject = $"Low Capacity Alert — {hotelName}",
            HtmlBody = $"""
                <h2>Low Capacity Warning</h2>
                <p><strong>Hotel:</strong> {hotelName}</p>
                <p>Remaining capacity for next month is <strong>{capacityPercent:F1}%</strong>.</p>
                <p>Consider reviewing your availability settings.</p>
                """,
        };
        message.To.Add(adminEmail);
        await resend.EmailSendAsync(message);
    }
}
