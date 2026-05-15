using NotificationService.Messaging;
using NotificationService.Services;
using Npgsql;
using RabbitMQ.Client;
using Resend;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Resend — transactional email
builder.Services.AddResend(options =>
    options.ApiToken = builder.Configuration["Resend:ApiKey"]!);

// CloudAMQP RabbitMQ
builder.Services.AddSingleton<IConnection>(_ =>
{
    var factory = new ConnectionFactory
    {
        Uri = new Uri(builder.Configuration.GetConnectionString("RabbitMQ")!)
    };
    return factory.CreateConnectionAsync().GetAwaiter().GetResult();
});

// Supabase PostgreSQL (for writing in-app notifications)
builder.Services.AddSingleton(NpgsqlDataSource.Create(
    builder.Configuration.GetConnectionString("Supabase")!));

// RabbitMQ background consumer
builder.Services.AddHostedService<BookingEventConsumer>();

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificationWriter, NotificationWriter>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.MapControllers();

app.Run();
