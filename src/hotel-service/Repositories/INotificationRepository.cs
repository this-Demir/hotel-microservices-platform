using HotelService.Models;

namespace HotelService.Repositories;

public interface INotificationRepository
{
    Task<(IReadOnlyList<Notification> Items, int Total)> GetPagedByUserAsync(string userId, int page, int pageSize);
    Task<Notification?> GetByIdForUserAsync(Guid id, string userId);
    Task UpdateAsync(Notification notification);
}
