using System.Text;
using System.Text.Json;
using AiAgentService.DTOs;
using OpenAI;
using OpenAI.Chat;

namespace AiAgentService.Services;

public class AgentService(OpenAIClient openAIClient, IHttpClientFactory httpClientFactory) : IAiAgentService
{
    internal static readonly ChatTool SearchTool = ChatTool.CreateFunctionTool(
        functionName: "search_hotels",
        functionDescription: "Search available hotels by location and dates",
        functionParameters: BinaryData.FromString("""
            {
              "type": "object",
              "properties": {
                "location":   { "type": "string",  "description": "City or destination" },
                "checkIn":    { "type": "string",  "description": "Check-in date (YYYY-MM-DD)" },
                "checkOut":   { "type": "string",  "description": "Check-out date (YYYY-MM-DD)" },
                "guestCount": { "type": "integer", "description": "Number of guests" }
              },
              "required": ["location", "checkIn", "checkOut", "guestCount"]
            }
            """));

    internal static readonly ChatTool BookTool = ChatTool.CreateFunctionTool(
        functionName: "book_hotel",
        functionDescription: "Book a hotel room for the authenticated user",
        functionParameters: BinaryData.FromString("""
            {
              "type": "object",
              "properties": {
                "roomId":     { "type": "string",  "description": "UUID of the room to book" },
                "checkIn":    { "type": "string",  "description": "Check-in date (YYYY-MM-DD)" },
                "checkOut":   { "type": "string",  "description": "Check-out date (YYYY-MM-DD)" },
                "guestCount": { "type": "integer", "description": "Number of guests" }
              },
              "required": ["roomId", "checkIn", "checkOut", "guestCount"]
            }
            """));

    public async Task<ChatResponse> ChatAsync(ChatRequest request, string userJwt)
    {
        var chatClient = openAIClient.GetChatClient("gpt-4o-mini");

        var messages = new List<ChatMessage>
        {
            ChatMessage.CreateSystemMessage(
                $"You are StayEase, a hotel booking assistant. Today's date is {DateTime.UtcNow:yyyy-MM-dd}. " +
                $"Your ONLY purpose is to help users search for hotels and make bookings. " +
                $"You have two tools: search_hotels and book_hotel. Use them to fulfill requests. " +
                $"Always use the current year when interpreting dates unless the user specifies otherwise. " +
                $"Always confirm check-in, check-out, guest count, and price before booking. " +
                $"If the user asks ANYTHING unrelated to hotels, travel, or bookings — such as coding questions, " +
                $"general knowledge, math, or any other topic — respond ONLY with: " +
                $"'I'm a hotel booking assistant. I can only help you search and book hotels.' " +
                $"Do not answer off-topic questions under any circumstances."),
        };

        foreach (var h in request.History ?? [])
        {
            messages.Add(h.Role == "user"
                ? ChatMessage.CreateUserMessage(h.Content)
                : ChatMessage.CreateAssistantMessage(h.Content));
        }

        messages.Add(ChatMessage.CreateUserMessage(request.Message));

        var options = new ChatCompletionOptions();
        options.Tools.Add(SearchTool);
        options.Tools.Add(BookTool);

        while (true)
        {
            var completion = await chatClient.CompleteChatAsync(messages, options);
            var result = completion.Value;

            if (result.FinishReason == ChatFinishReason.ToolCalls)
            {
                messages.Add(new AssistantChatMessage(result.ToolCalls));

                foreach (var toolCall in result.ToolCalls)
                {
                    var toolResult = await ExecuteToolCallAsync(toolCall, userJwt);
                    messages.Add(new ToolChatMessage(toolCall.Id, toolResult));
                }
            }
            else
            {
                var text = result.Content.Count > 0 ? result.Content[0].Text : string.Empty;
                return new ChatResponse(text);
            }
        }
    }

    internal async Task<string> ExecuteToolCallAsync(ChatToolCall toolCall, string userJwt)
    {
        var http = httpClientFactory.CreateClient("hotel-service");
        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userJwt);

        try
        {
            using var args = JsonDocument.Parse(toolCall.FunctionArguments);
            var root = args.RootElement;

            if (toolCall.FunctionName == "search_hotels")
            {
                var location   = root.GetProperty("location").GetString() ?? string.Empty;
                var checkIn    = root.GetProperty("checkIn").GetString() ?? string.Empty;
                var checkOut   = root.GetProperty("checkOut").GetString() ?? string.Empty;
                var guestCount = root.GetProperty("guestCount").GetInt32();

                var url = $"/api/v1/search?location={Uri.EscapeDataString(location)}" +
                          $"&checkIn={checkIn}&checkOut={checkOut}&guestCount={guestCount}";
                return await http.GetStringAsync(url);
            }
            else if (toolCall.FunctionName == "book_hotel")
            {
                var body = JsonSerializer.Serialize(new
                {
                    roomId     = root.GetProperty("roomId").GetString(),
                    checkIn    = root.GetProperty("checkIn").GetString(),
                    checkOut   = root.GetProperty("checkOut").GetString(),
                    guestCount = root.GetProperty("guestCount").GetInt32(),
                });
                using var content = new StringContent(body, Encoding.UTF8, "application/json");
                var response = await http.PostAsync("/api/v1/bookings", content);
                return await response.Content.ReadAsStringAsync();
            }

            return """{"error":"unknown tool"}""";
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }
}
