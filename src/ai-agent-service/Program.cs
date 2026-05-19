using AiAgentService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using OpenAI;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// JWT auth (Cognito) — user JWT forwarded to hotel-service calls for 15% discount logic
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Cognito:Authority"];
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new()
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            ValidateAudience = false,
        };
    });

// OpenAI — key never leaves this service
builder.Services.AddSingleton(new OpenAIClient(
    builder.Configuration["OpenAI:ApiKey"]!));

// Named HttpClient for hotel-service tool calls
builder.Services.AddHttpClient("hotel-service", client =>
    client.BaseAddress = new Uri(builder.Configuration["ServiceUrls:HotelService"]!));

builder.Services.AddHttpClient("comments-service", client =>
    client.BaseAddress = new Uri(builder.Configuration["ServiceUrls:CommentsService"]!));

builder.Services.AddScoped<IAiAgentService, AgentService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok("healthy"));

app.Run();
