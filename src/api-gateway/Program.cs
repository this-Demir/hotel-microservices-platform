using Microsoft.AspNetCore.Authentication.JwtBearer;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

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

app.UseAuthentication();
app.UseAuthorization();

await app.UseOcelot();

app.Run();
