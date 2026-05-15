using HotelService.DTOs;

namespace HotelService.Services;

public interface IBookingService
{
    Task<BookingResponse> BookRoomAsync(BookRoomRequest request, string userId, bool isAuthenticated);
}
