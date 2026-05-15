using AiAgentService.DTOs;

namespace AiAgentService.Services;

public interface IAiAgentService
{
    Task<ChatResponse> ChatAsync(ChatRequest request, string userJwt);
}
