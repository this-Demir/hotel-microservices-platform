using HotelService.Data;
using HotelService.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Services;

public class NotificationService(HotelDbContext db) : INotificationService
{
    public async Task<PagedResult<NotificationResponse>> GetNotificationsAsync(string userId, int page, int pageSize)
    {
        var query = db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationResponse(n.Id, n.Title, n.Body, n.IsRead, n.CreatedAt))
            .ToListAsync();

        return new PagedResult<NotificationResponse>(items, page, pageSize, total);
    }

    public async Task MarkAsReadAsync(Guid notificationId, string userId)
    {
        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
        if (notification is null) return;
        notification.IsRead = true;
        await db.SaveChangesAsync();
    }
}
