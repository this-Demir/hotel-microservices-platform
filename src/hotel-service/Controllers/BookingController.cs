using HotelService.DTOs;
using HotelService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelService.Controllers;

[ApiController]
[Route("api/v1/bookings")]
[Authorize]
public class BookingController(IBookingService bookingService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Book([FromBody] BookRoomRequest request)
    {
        var userId = User.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("sub claim missing");
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
        var booking = await bookingService.BookRoomAsync(request, userId, isAuthenticated);
        return Ok(booking);
    }
}
