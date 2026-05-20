using HotelService.Models;

namespace HotelService.Repositories;

public interface IRoomRepository
{
    Task<Room?> GetByIdAsync(Guid id);
    Task<Room?> GetByIdWithHotelAsync(Guid id);
    Task<(IReadOnlyList<Room> Items, int Total)> GetPagedByHotelAsync(Guid hotelId, int page, int pageSize);
    Task AddAsync(Room room);
    Task UpdateAsync(Room room);
    Task DeleteAsync(Room room);
}
