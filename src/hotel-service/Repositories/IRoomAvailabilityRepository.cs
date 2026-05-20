using HotelService.Models;

namespace HotelService.Repositories;

public interface IRoomAvailabilityRepository
{
    Task<(IReadOnlyList<RoomAvailability> Items, int Total)> SearchAsync(
        string? location, DateOnly checkIn, DateOnly checkOut, int guestCount, int page, int pageSize);
    Task<IReadOnlyList<RoomAvailability>> GetVacantByHotelAsync(Guid hotelId, DateOnly fromDate);
    Task<IReadOnlyList<RoomAvailability>> GetByRoomAsync(Guid roomId);
    Task<RoomAvailability?> GetByIdAsync(Guid id);
    Task<RoomAvailability?> GetByRoomAndDatesAsync(Guid roomId, DateOnly startDate, DateOnly endDate);
    Task AddAsync(RoomAvailability availability);
    Task UpdateAsync(RoomAvailability availability);
    Task DeleteAsync(RoomAvailability availability);
}
