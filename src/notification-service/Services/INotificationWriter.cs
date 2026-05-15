namespace NotificationService.Services;

public interface INotificationWriter
{
    Task WriteAsync(string userId, string title, string body);
}
