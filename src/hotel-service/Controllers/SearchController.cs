using HotelService.DTOs;
using HotelService.Services;
using Microsoft.AspNetCore.Mvc;

namespace HotelService.Controllers;

[ApiController]
[Route("api/v1/search")]
public class SearchController(ISearchService searchService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] SearchRequest request)
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
        var results = await searchService.SearchAsync(request, isAuthenticated);
        return Ok(results);
    }

    [HttpGet("{roomId:guid}")]
    public async Task<IActionResult> GetRoomDetail(Guid roomId)
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
        var detail = await searchService.GetRoomDetailAsync(roomId, isAuthenticated);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpGet("hotel/{hotelId:guid}")]
    public async Task<IActionResult> GetHotelDetail(Guid hotelId)
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
        var detail = await searchService.GetHotelDetailAsync(hotelId, isAuthenticated);
        return detail is null ? NotFound() : Ok(detail);
    }
}
