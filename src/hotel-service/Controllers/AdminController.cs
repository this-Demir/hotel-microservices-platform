using HotelService.DTOs;
using HotelService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelService.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize]
public class AdminController(IHotelAdminService adminService) : ControllerBase
{
    [HttpGet("hotels")]
    public async Task<IActionResult> GetHotels([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        => Ok(await adminService.GetHotelsAsync(page, pageSize));

    [HttpGet("hotels/{id:guid}")]
    public async Task<IActionResult> GetHotel(Guid id)
    {
        var hotel = await adminService.GetHotelAsync(id);
        return hotel is null ? NotFound() : Ok(hotel);
    }

    [HttpPost("hotels")]
    public async Task<IActionResult> CreateHotel([FromBody] CreateHotelRequest request)
    {
        var hotel = await adminService.CreateHotelAsync(request);
        return CreatedAtAction(nameof(GetHotel), new { id = hotel.Id }, hotel);
    }

    [HttpPut("hotels/{id:guid}")]
    public async Task<IActionResult> UpdateHotel(Guid id, [FromBody] UpdateHotelRequest request)
    {
        var hotel = await adminService.UpdateHotelAsync(id, request);
        return hotel is null ? NotFound() : Ok(hotel);
    }

    [HttpDelete("hotels/{id:guid}")]
    public async Task<IActionResult> DeleteHotel(Guid id)
    {
        var deleted = await adminService.DeleteHotelAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("rooms")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
        => Ok(await adminService.CreateRoomAsync(request));

    [HttpPost("availability")]
    public async Task<IActionResult> SetAvailability([FromBody] SetAvailabilityRequest request)
        => Ok(await adminService.SetAvailabilityAsync(request));
}
