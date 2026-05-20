using HotelService.Models;

namespace HotelService.Repositories;

public interface IHotelRepository
{
    Task<Hotel?> GetByIdAsync(Guid id);
    Task<(IReadOnlyList<Hotel> Items, int Total)> GetPagedAsync(int page, int pageSize);
    Task AddAsync(Hotel hotel);
    Task UpdateAsync(Hotel hotel);
    Task DeleteAsync(Hotel hotel);
}
