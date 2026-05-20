using HotelService.DTOs;
using HotelService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelService.Controllers;

[ApiController]
[Route("api/v1/bookings")]
[Authorize]
public class BookingController(IBookingService bookingService, ILogger<BookingController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetReservations([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        return Ok(await bookingService.GetUserReservationsAsync(userId, page, pageSize));
    }

    [HttpPost]
    public async Task<IActionResult> Book([FromBody] BookRoomRequest request)
    {
        var userId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var userEmail = User.FindFirst("email")?.Value ?? string.Empty;
            var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
            var booking = await bookingService.BookRoomAsync(request, userId, userEmail, isAuthenticated);
            return Ok(booking);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during booking for user {UserId}", userId);
            return StatusCode(500, new { error = "An unexpected error occurred." });
        }
    }
}
