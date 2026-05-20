using HotelService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelService.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("sub claim missing");
        return Ok(await notificationService.GetNotificationsAsync(userId, page, pageSize));
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userId = User.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("sub claim missing");
        await notificationService.MarkAsReadAsync(id, userId);
        return NoContent();
    }
}
