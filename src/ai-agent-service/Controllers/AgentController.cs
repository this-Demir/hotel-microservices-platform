using AiAgentService.DTOs;
using AiAgentService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiAgentService.Controllers;

[ApiController]
[Route("api/v1/agent")]
[Authorize]
public class AgentController(IAiAgentService agentService) : ControllerBase
{
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        // Forward the user's JWT so hotel-service applies the 15% discount and booking identity
        var token = HttpContext.Request.Headers.Authorization
            .ToString().Replace("Bearer ", string.Empty);
        return Ok(await agentService.ChatAsync(request, token));
    }
}
