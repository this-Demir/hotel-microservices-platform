using HotelService.Models;

namespace HotelService.Repositories;

public interface IHotelImageRepository
{
    Task<IReadOnlyList<HotelImage>> GetByHotelAsync(Guid hotelId);
    Task<HotelImage?> GetByIdAsync(Guid id);
    Task<HotelImage?> GetOldestByHotelExcludingAsync(Guid hotelId, Guid excludeId);
    Task AddAsync(HotelImage image);
    Task DeleteAsync(HotelImage image);
}
