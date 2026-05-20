using HotelService.Data;
using HotelService.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Repositories;

public class NotificationRepository(HotelDbContext db) : INotificationRepository
{
    public async Task<(IReadOnlyList<Notification> Items, int Total)> GetPagedByUserAsync(
        string userId, int page, int pageSize)
    {
        var query = db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<Notification?> GetByIdForUserAsync(Guid id, string userId) =>
        await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

    public async Task UpdateAsync(Notification notification)
    {
        await db.SaveChangesAsync();
    }
}
