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

    [HttpGet("hotels/{id:guid}/images")]
    public async Task<IActionResult> GetHotelImages(Guid id)
        => Ok(await adminService.GetHotelImagesAsync(id));

    [HttpPost("hotels/{id:guid}/images")]
    public async Task<IActionResult> UploadHotelImage(Guid id, IFormFile file, [FromForm] string title)
    {
        try
        {
            var image = await adminService.UploadHotelImageAsync(id, title, file);
            return Ok(image);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("hotels/{hotelId:guid}/images/{imageId:guid}")]
    public async Task<IActionResult> DeleteHotelImage(Guid hotelId, Guid imageId)
    {
        var deleted = await adminService.DeleteHotelImageAsync(imageId);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms([FromQuery] Guid hotelId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await adminService.GetRoomsAsync(hotelId, page, pageSize));

    [HttpPost("rooms")]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
        => Ok(await adminService.CreateRoomAsync(request));

    [HttpPut("rooms/{id:guid}")]
    public async Task<IActionResult> UpdateRoom(Guid id, [FromBody] UpdateRoomRequest request)
    {
        var room = await adminService.UpdateRoomAsync(id, request);
        return room is null ? NotFound() : Ok(room);
    }

    [HttpDelete("rooms/{id:guid}")]
    public async Task<IActionResult> DeleteRoom(Guid id)
    {
        try
        {
            var deleted = await adminService.DeleteRoomAsync(id);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability([FromQuery] Guid roomId)
        => Ok(await adminService.GetAvailabilityAsync(roomId));

    [HttpPost("availability")]
    public async Task<IActionResult> SetAvailability([FromBody] SetAvailabilityRequest request)
        => Ok(await adminService.SetAvailabilityAsync(request));

    [HttpDelete("availability/{id:guid}")]
    public async Task<IActionResult> DeleteAvailability(Guid id)
    {
        try
        {
            var deleted = await adminService.DeleteAvailabilityAsync(id);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}
