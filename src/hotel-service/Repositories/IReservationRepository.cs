using HotelService.Models;

namespace HotelService.Repositories;

public interface IReservationRepository
{
    Task<Reservation> CreateBookingAsync(
        Guid roomId, string userId, DateOnly checkIn, DateOnly checkOut, int guestCount, decimal pricePaid);
    Task<(IReadOnlyList<Reservation> Items, int Total)> GetPagedByUserAsync(string userId, int page, int pageSize);
    Task<(IReadOnlyList<Reservation> Items, int Total)> GetAllPagedAsync(int page, int pageSize);
    Task<bool> AnyByRoomAsync(Guid roomId);
}
