using System.ClientModel;
using System.Reflection;
using System.Text.Json;
using AiAgentService.Services;
using Moq;
using OpenAI;
using OpenAI.Chat;

namespace AiAgentService.Tests;

public class AgentServiceTests
{
    private static AgentService Build()
    {
        var mockFactory = new Mock<IHttpClientFactory>();
        var openAIClient = new OpenAIClient(new ApiKeyCredential("test-key-not-used"));
        return new AgentService(openAIClient, mockFactory.Object);
    }

    // ── Tool definitions ───────────────────────────────────────────────────────

    [Fact]
    public void SearchTool_HasCorrectFunctionName()
    {
        Assert.Equal("search_hotels", AgentService.SearchTool.FunctionName);
    }

    [Fact]
    public void BookTool_HasCorrectFunctionName()
    {
        Assert.Equal("book_hotel", AgentService.BookTool.FunctionName);
    }

    [Fact]
    public void SearchTool_RequiredParams_IncludeAllExpectedFields()
    {
        using var doc = JsonDocument.Parse(AgentService.SearchTool.FunctionParameters!);
        var required = doc.RootElement
            .GetProperty("required")
            .EnumerateArray()
            .Select(e => e.GetString())
            .ToList();

        Assert.Contains("location", required);
        Assert.Contains("checkIn", required);
        Assert.Contains("checkOut", required);
        Assert.Contains("guestCount", required);
    }

    [Fact]
    public void BookTool_RequiredParams_IncludeAllExpectedFields()
    {
        using var doc = JsonDocument.Parse(AgentService.BookTool.FunctionParameters!);
        var required = doc.RootElement
            .GetProperty("required")
            .EnumerateArray()
            .Select(e => e.GetString())
            .ToList();

        Assert.Contains("roomId", required);
        Assert.Contains("checkIn", required);
        Assert.Contains("checkOut", required);
        Assert.Contains("guestCount", required);
    }

    [Fact]
    public void SearchTool_Parameters_HaveCorrectPropertyTypes()
    {
        using var doc = JsonDocument.Parse(AgentService.SearchTool.FunctionParameters!);
        var props = doc.RootElement.GetProperty("properties");

        Assert.Equal("string", props.GetProperty("location").GetProperty("type").GetString());
        Assert.Equal("string", props.GetProperty("checkIn").GetProperty("type").GetString());
        Assert.Equal("string", props.GetProperty("checkOut").GetProperty("type").GetString());
        Assert.Equal("integer", props.GetProperty("guestCount").GetProperty("type").GetString());
    }

    [Fact]
    public void BookTool_Parameters_HaveCorrectPropertyTypes()
    {
        using var doc = JsonDocument.Parse(AgentService.BookTool.FunctionParameters!);
        var props = doc.RootElement.GetProperty("properties");

        Assert.Equal("string", props.GetProperty("roomId").GetProperty("type").GetString());
        Assert.Equal("string", props.GetProperty("checkIn").GetProperty("type").GetString());
        Assert.Equal("string", props.GetProperty("checkOut").GetProperty("type").GetString());
        Assert.Equal("integer", props.GetProperty("guestCount").GetProperty("type").GetString());
    }

    // ── ExecuteToolCallAsync (internal) ────────────────────────────────────────

    [Fact]
    public async Task ExecuteToolCall_SearchHotels_BuildsGetRequest()
    {
        HttpRequestMessage? captured = null;
        var handler = new DelegatingHandlerFake(req =>
        {
            captured = req;
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent("[]"),
            };
        });

        var client = new HttpClient(handler) { BaseAddress = new Uri("http://hotel-service/") };
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("hotel-service")).Returns(client);

        var openAIClient = new OpenAIClient(new ApiKeyCredential("test-key-not-used"));
        var service = new AgentService(openAIClient, factory.Object);

        var toolCall = MakeToolCall("search_hotels",
            """{"location":"Paris","checkIn":"2026-07-01","checkOut":"2026-07-05","guestCount":2}""");

        await service.ExecuteToolCallAsync(toolCall, "test-jwt");

        Assert.NotNull(captured);
        Assert.Equal(HttpMethod.Get, captured.Method);
        Assert.Contains("/api/v1/search", captured.RequestUri!.PathAndQuery);
        Assert.Contains("Paris", captured.RequestUri.Query);
    }

    [Fact]
    public async Task ExecuteToolCall_BookHotel_BuildsPostRequest()
    {
        HttpRequestMessage? captured = null;
        var handler = new DelegatingHandlerFake(req =>
        {
            captured = req;
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent("{}"),
            };
        });

        var client = new HttpClient(handler) { BaseAddress = new Uri("http://hotel-service/") };
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("hotel-service")).Returns(client);

        var openAIClient = new OpenAIClient(new ApiKeyCredential("test-key-not-used"));
        var service = new AgentService(openAIClient, factory.Object);

        var roomId = Guid.NewGuid().ToString();
        var toolCall = MakeToolCall("book_hotel",
            $$"""{"roomId":"{{roomId}}","checkIn":"2026-07-01","checkOut":"2026-07-05","guestCount":2}""");

        await service.ExecuteToolCallAsync(toolCall, "test-jwt");

        Assert.NotNull(captured);
        Assert.Equal(HttpMethod.Post, captured.Method);
        Assert.Contains("/api/v1/bookings", captured.RequestUri!.PathAndQuery);
    }

    [Fact]
    public async Task ExecuteToolCall_UnknownTool_ReturnsErrorJson()
    {
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("hotel-service"))
            .Returns(new HttpClient { BaseAddress = new Uri("http://hotel-service/") });

        var openAIClient = new OpenAIClient(new ApiKeyCredential("test-key-not-used"));
        var service = new AgentService(openAIClient, factory.Object);

        var toolCall = MakeToolCall("unknown_tool", "{}");
        var result = await service.ExecuteToolCallAsync(toolCall, "test-jwt");

        Assert.Contains("error", result);
        Assert.Contains("unknown tool", result);
    }

    [Fact]
    public async Task ExecuteToolCall_ForwardsJwtAsAuthorizationHeader()
    {
        HttpRequestMessage? captured = null;
        var handler = new DelegatingHandlerFake(req =>
        {
            captured = req;
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent("[]"),
            };
        });

        var client = new HttpClient(handler) { BaseAddress = new Uri("http://hotel-service/") };
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("hotel-service")).Returns(client);

        var openAIClient = new OpenAIClient(new ApiKeyCredential("test-key-not-used"));
        var service = new AgentService(openAIClient, factory.Object);

        var toolCall = MakeToolCall("search_hotels",
            """{"location":"Rome","checkIn":"2026-08-01","checkOut":"2026-08-05","guestCount":1}""");

        await service.ExecuteToolCallAsync(toolCall, "my-bearer-token");

        Assert.Equal("my-bearer-token",
            captured!.Headers.Authorization?.Parameter);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a ChatToolCall via the internal wire format (ModelReaderWriter).
    /// </summary>
    private static ChatToolCall MakeToolCall(string name, string argumentsJson)
    {
        var json = $$"""
            {
              "id": "call_test_{{Guid.NewGuid():N}}",
              "type": "function",
              "function": {
                "name": "{{name}}",
                "arguments": {{JsonSerializer.Serialize(argumentsJson)}}
              }
            }
            """;
        return System.ClientModel.Primitives.ModelReaderWriter.Read<ChatToolCall>(
            BinaryData.FromString(json))!;
    }
}

file sealed class DelegatingHandlerFake(Func<HttpRequestMessage, HttpResponseMessage> handler)
    : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
        => Task.FromResult(handler(request));
}
