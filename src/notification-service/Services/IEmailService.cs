namespace NotificationService.Services;

public interface IEmailService
{
    Task SendBookingConfirmationAsync(
        string toEmail,
        string hotelName,
        string roomType,
        DateOnly checkIn,
        DateOnly checkOut,
        decimal pricePaid);

    Task SendCapacityAlertAsync(
        string adminEmail,
        string hotelName,
        double capacityPercent);
}
