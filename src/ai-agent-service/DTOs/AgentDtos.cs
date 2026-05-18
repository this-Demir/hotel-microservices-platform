namespace AiAgentService.DTOs;

public record ConversationMessage(string Role, string Content);
public record ChatRequest(string Message, List<ConversationMessage>? History = null);
public record ChatResponse(string Reply, string? StructuredType = null, string? StructuredData = null);
