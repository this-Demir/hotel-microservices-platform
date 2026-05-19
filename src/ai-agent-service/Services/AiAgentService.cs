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

    internal static readonly ChatTool GetCommentsTool = ChatTool.CreateFunctionTool(
        functionName: "get_hotel_comments",
        functionDescription: "Fetch guest reviews for a specific hotel, sorted by overall rating descending. Returns average rating and paginated comments.",
        functionParameters: BinaryData.FromString("""
            {
              "type": "object",
              "properties": {
                "hotelId":  { "type": "string",  "description": "UUID of the hotel" },
                "page":     { "type": "integer", "description": "Page number (default 1)" },
                "pageSize": { "type": "integer", "description": "Reviews per page (default 5, max 20)" }
              },
              "required": ["hotelId"]
            }
            """));

    public async Task<ChatResponse> ChatAsync(ChatRequest request, string userJwt)
    {
        var chatClient = openAIClient.GetChatClient("gpt-4o-mini");

        var messages = new List<ChatMessage>
        {
            ChatMessage.CreateSystemMessage(
                $"You are StayEase, a hotel booking assistant. Today's date is {DateTime.UtcNow:yyyy-MM-dd}. " +
                $"Your ONLY purpose is to help users search for hotels, read reviews, and make bookings. " +
                $"You have three tools: search_hotels, book_hotel, and get_hotel_comments. " +
                $"Use get_hotel_comments ONLY when you already have the hotel's UUID from a prior search_hotels call. If you do not have a UUID, call search_hotels first to obtain it, then call get_hotel_comments. Never guess or invent a hotelId. " +
                $"When presenting reviews, summarize key themes and always mention the average rating (e.g. '4.2/5'). " +
                $"When recommending hotels, factor in the average rating from reviews if available. " +
                $"Always use the current year when interpreting dates unless the user specifies otherwise. " +
                $"When search results are shown to the user as interactive cards, they can book directly — " +
                $"do NOT ask them to confirm again if they already clicked Book Now. " +
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
        options.Tools.Add(GetCommentsTool);

        string? lastSearchResultJson = null;
        string? lastSearchCheckIn = null;
        string? lastSearchCheckOut = null;
        int lastSearchGuestCount = 0;
        string? lastCommentsResultJson = null;

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

                    if (toolCall.FunctionName == "search_hotels")
                    {
                        lastSearchResultJson = toolResult;
                        using var argsDoc = JsonDocument.Parse(toolCall.FunctionArguments);
                        var root = argsDoc.RootElement;
                        lastSearchCheckIn = root.GetProperty("checkIn").GetString() ?? "";
                        lastSearchCheckOut = root.GetProperty("checkOut").GetString() ?? "";
                        lastSearchGuestCount = root.GetProperty("guestCount").GetInt32();
                    }
                    else if (toolCall.FunctionName == "get_hotel_comments")
                    {
                        lastCommentsResultJson = toolResult;
                    }
                }
            }
            else
            {
                var text = result.Content.Count > 0 ? result.Content[0].Text : string.Empty;

                if (lastSearchResultJson != null)
                {
                    string itemsRaw = "[]";
                    int totalCount = 0;
                    using var searchDoc = JsonDocument.Parse(lastSearchResultJson);
                    var searchRoot = searchDoc.RootElement;
                    if (searchRoot.TryGetProperty("items", out var itemsEl))
                        itemsRaw = itemsEl.GetRawText();
                    if (searchRoot.TryGetProperty("totalCount", out var tcEl))
                        totalCount = tcEl.GetInt32();

                    var structuredData =
                        $"{{\"checkIn\":\"{lastSearchCheckIn}\"," +
                        $"\"checkOut\":\"{lastSearchCheckOut}\"," +
                        $"\"guestCount\":{lastSearchGuestCount}," +
                        $"\"totalCount\":{totalCount}," +
                        $"\"items\":{itemsRaw}}}";

                    return new ChatResponse(text, "search_results", structuredData);
                }

                if (lastCommentsResultJson != null)
                    return new ChatResponse(text, "review_results", lastCommentsResultJson);

                return new ChatResponse(text);
            }
        }
    }

    internal async Task<string> ExecuteToolCallAsync(ChatToolCall toolCall, string userJwt)
    {
        try
        {
            using var args = JsonDocument.Parse(toolCall.FunctionArguments);
            var root = args.RootElement;

            if (toolCall.FunctionName == "get_hotel_comments")
            {
                var hotelId  = root.GetProperty("hotelId").GetString() ?? string.Empty;
                var page     = root.TryGetProperty("page",     out var pg) ? pg.GetInt32() : 1;
                var pageSize = root.TryGetProperty("pageSize", out var ps) ? Math.Min(ps.GetInt32(), 20) : 5;

                var http = httpClientFactory.CreateClient("comments-service");
                var url = $"/api/v1/comments/{hotelId}?page={page}&pageSize={pageSize}";
                return await http.GetStringAsync(url);
            }

            var hotelHttp = httpClientFactory.CreateClient("hotel-service");
            hotelHttp.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", userJwt);

            if (toolCall.FunctionName == "search_hotels")
            {
                var location   = root.GetProperty("location").GetString() ?? string.Empty;
                var checkIn    = root.GetProperty("checkIn").GetString() ?? string.Empty;
                var checkOut   = root.GetProperty("checkOut").GetString() ?? string.Empty;
                var guestCount = root.GetProperty("guestCount").GetInt32();

                var url = $"/api/v1/search?location={Uri.EscapeDataString(location)}" +
                          $"&checkIn={checkIn}&checkOut={checkOut}&guestCount={guestCount}";
                return await hotelHttp.GetStringAsync(url);
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
                var response = await hotelHttp.PostAsync("/api/v1/bookings", content);
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
