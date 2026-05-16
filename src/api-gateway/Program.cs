using Microsoft.AspNetCore.Authentication.JwtBearer;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Load environment-specific ocelot config (e.g. ocelot.Docker.json) if present,
// otherwise fall back to ocelot.json (local dotnet run).
var ocelotFile = $"ocelot.{builder.Environment.EnvironmentName}.json";
builder.Configuration.AddJsonFile(
    File.Exists(ocelotFile) ? ocelotFile : "ocelot.json",
    optional: false, reloadOnChange: true);

// CORS — allow frontends (local + production Vercel URL)
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:3000,http://localhost:3001")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

// JWT validation against Cognito JWKS — downstream services trust forwarded headers
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Cognito:Authority"];
        options.TokenValidationParameters = new()
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            ValidateAudience = false,
        };
    });

builder.Services.AddOcelot();

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

await app.UseOcelot();

app.Run();
