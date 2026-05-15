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
}
