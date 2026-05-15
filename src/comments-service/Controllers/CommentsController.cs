using CommentsService.DTOs;
using CommentsService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CommentsService.Controllers;

[ApiController]
[Route("api/v1/comments")]
public class CommentsController(ICommentService commentService) : ControllerBase
{
    [HttpGet("{hotelId:guid}")]
    public async Task<IActionResult> GetByHotel(
        Guid hotelId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
        => Ok(await commentService.GetByHotelAsync(hotelId, page, pageSize));

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateCommentRequest request)
    {
        var userId = User.FindFirst("sub")?.Value ?? string.Empty;
        var comment = await commentService.CreateAsync(request, userId);
        return CreatedAtAction(nameof(GetByHotel), new { hotelId = comment.HotelId }, comment);
    }
}
