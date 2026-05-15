using HotelService.DTOs;

namespace HotelService.Services;

public interface INotificationService
{
    Task<PagedResult<NotificationResponse>> GetNotificationsAsync(string userId, int page, int pageSize);
    Task MarkAsReadAsync(Guid notificationId, string userId);
}
