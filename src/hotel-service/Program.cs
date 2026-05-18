using HotelService.Data;
using HotelService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient();

// Supabase PostgreSQL
builder.Services.AddDbContext<HotelDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

// JWT auth — Cognito JWKS; downstream extracts `sub` claim from forwarded header
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

// Redis — Parse() doesn't populate SslHost from rediss:// on Linux; only set it when SSL is active
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
{
    var raw = builder.Configuration.GetConnectionString("Redis")!;
    var opts = ConfigurationOptions.Parse(raw);
    opts.AbortOnConnectFail = false;
    if (opts.Ssl)
    {
        var atIdx = raw.LastIndexOf('@');
        if (atIdx >= 0)
        {
            var hostPort = raw[(atIdx + 1)..];
            opts.SslHost = hostPort.Contains(':') ? hostPort[..hostPort.LastIndexOf(':')] : hostPort;
        }
    }
    return ConnectionMultiplexer.Connect(opts);
});

// CloudAMQP RabbitMQ — retry on startup so Cloud Run cold-starts survive transient RabbitMQ unavailability
builder.Services.AddSingleton<IConnection>(_ =>
{
    var factory = new ConnectionFactory
    {
        Uri = new Uri(builder.Configuration.GetConnectionString("RabbitMQ")!),
        AutomaticRecoveryEnabled = true,
    };
    for (var i = 0; i < 5; i++)
    {
        try { return factory.CreateConnectionAsync().GetAwaiter().GetResult(); }
        catch { Thread.Sleep(2000); }
    }
    return factory.CreateConnectionAsync().GetAwaiter().GetResult();
});

// Application services
builder.Services.AddScoped<IHotelAdminService, HotelAdminService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok("healthy"));

// Warm up Redis connection immediately so the first search request hits cache
app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        try
        {
            var mux = app.Services.GetRequiredService<IConnectionMultiplexer>();
            await mux.GetDatabase().PingAsync();
        }
        catch { }
    });
});

app.Run();
