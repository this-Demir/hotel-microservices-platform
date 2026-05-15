using HotelService.DTOs;

namespace HotelService.Services;

public interface IBookingService
{
    Task<BookingResponse> BookRoomAsync(BookRoomRequest request, string userId, string userEmail, bool isAuthenticated);
    Task<PagedResult<ReservationResponse>> GetUserReservationsAsync(string userId, int page, int pageSize);
}
