using HotelService.DTOs;
using HotelService.Repositories;

namespace HotelService.Services;

public class NotificationService(INotificationRepository notificationRepo) : INotificationService
{
    public async Task<PagedResult<NotificationResponse>> GetNotificationsAsync(
        string userId, int page, int pageSize)
    {
        var (items, total) = await notificationRepo.GetPagedByUserAsync(userId, page, pageSize);
        var dtos = items.Select(n => new NotificationResponse(n.Id, n.Title, n.Body, n.IsRead, n.CreatedAt));
        return new PagedResult<NotificationResponse>(dtos, page, pageSize, total);
    }

    public async Task MarkAsReadAsync(Guid notificationId, string userId)
    {
        var notification = await notificationRepo.GetByIdForUserAsync(notificationId, userId);
        if (notification is null) return;
        notification.IsRead = true;
        await notificationRepo.UpdateAsync(notification);
    }
}
