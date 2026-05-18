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
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { error = "Message cannot be empty." });

        if (request.Message.Length < 3)
            return BadRequest(new { error = "Message is too short." });

        if (request.Message.Length > 500)
            return BadRequest(new { error = "Message cannot exceed 500 characters." });

        if (request.History is { Count: > 40 })
            return BadRequest(new { error = "Conversation history is too long. Please start a new chat." });

        var token = HttpContext.Request.Headers.Authorization
            .ToString().Replace("Bearer ", string.Empty);
        return Ok(await agentService.ChatAsync(request, token));
    }
}
