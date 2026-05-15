using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Amazon.Lambda.Core;
using Npgsql;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace CapacityCheckerFunction;

public class Function
{
    private static readonly HttpClient Http = new();

    /// <summary>
    /// Nightly capacity checker: queries rooms with less than 20% remaining capacity for next month,
    /// sends alert emails via Resend, and inserts in-app notifications into Supabase.
    /// Triggered nightly by Amazon EventBridge.
    /// </summary>
    public async Task FunctionHandler(JsonElement input, ILambdaContext context)
    {
        var connectionString = Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING")!;
        var resendApiKey     = Environment.GetEnvironmentVariable("RESEND_API_KEY")!;
        var fromEmail        = Environment.GetEnvironmentVariable("NOTIFICATION_FROM_EMAIL") ?? "alerts@example.com";

        await using var dataSource = NpgsqlDataSource.Create(connectionString);
        await using var conn       = await dataSource.OpenConnectionAsync();

        var alerts = await QueryLowCapacityRoomsAsync(conn);

        foreach (var alert in alerts)
        {
            await SendAlertEmailAsync(resendApiKey, fromEmail, alert, context.Logger);
            await InsertNotificationAsync(conn, alert, context.Logger);
        }

        context.Logger.LogInformation("Capacity check complete. {Count} alert(s) sent.", alerts.Count);
    }

    private static async Task<List<CapacityAlert>> QueryLowCapacityRoomsAsync(NpgsqlConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            WITH next_month AS (
                SELECT
                    date_trunc('month', now() + interval '1 month')::date AS first_day,
                    (date_trunc('month', now() + interval '2 months') - interval '1 day')::date AS last_day
            )
            SELECT
                ra."TotalCapacity",
                ra."ReservedCount",
                r."RoomType",
                h."Name"       AS hotel_name,
                h."AdminEmail"
            FROM "RoomAvailabilities" ra
            JOIN "Rooms"  r  ON ra."RoomId"  = r."Id"
            JOIN "Hotels" h  ON r."HotelId"  = h."Id",
                 next_month nm
            WHERE ra."StartDate" <= nm.last_day
              AND ra."EndDate"   >= nm.first_day
              AND ra."TotalCapacity" > 0
              AND ra."ReservedCount"::float / ra."TotalCapacity" > 0.80
            """;

        await using var reader = await cmd.ExecuteReaderAsync();
        var results = new List<CapacityAlert>();

        while (await reader.ReadAsync())
        {
            var total    = reader.GetInt32(reader.GetOrdinal("TotalCapacity"));
            var reserved = reader.GetInt32(reader.GetOrdinal("ReservedCount"));
            results.Add(new CapacityAlert(
                HotelName:      reader.GetString(reader.GetOrdinal("hotel_name")),
                RoomType:       reader.GetString(reader.GetOrdinal("RoomType")),
                AdminEmail:     reader.GetString(reader.GetOrdinal("AdminEmail")),
                RemainingPct:   100.0 * (total - reserved) / total));
        }

        return results;
    }

    private static async Task SendAlertEmailAsync(
        string apiKey, string from, CapacityAlert alert, ILambdaLogger logger)
    {
        var payload = JsonSerializer.Serialize(new
        {
            from,
            to      = new[] { alert.AdminEmail },
            subject = $"Low Capacity Alert — {alert.HotelName}",
            html    = $"""
                <h2>Low Capacity Warning</h2>
                <p><strong>Hotel:</strong> {alert.HotelName}</p>
                <p><strong>Room Type:</strong> {alert.RoomType}</p>
                <p>Remaining capacity for next month is <strong>{alert.RemainingPct:F1}%</strong>.</p>
                <p>Consider reviewing your availability settings.</p>
                """,
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        var response = await Http.SendAsync(request);
        if (!response.IsSuccessStatusCode)
            logger.LogWarning("Resend returned {Status} for {Hotel}", (int)response.StatusCode, alert.HotelName);
    }

    private static async Task InsertNotificationAsync(
        NpgsqlConnection conn, CapacityAlert alert, ILambdaLogger logger)
    {
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                INSERT INTO "Notifications" ("Id", "UserId", "Title", "Body", "IsRead", "CreatedAt")
                VALUES (@id, @userId, @title, @body, false, now())
                """;
            cmd.Parameters.AddWithValue("@id",     Guid.NewGuid());
            cmd.Parameters.AddWithValue("@userId", alert.AdminEmail);
            cmd.Parameters.AddWithValue("@title",  $"Low Capacity — {alert.HotelName}");
            cmd.Parameters.AddWithValue("@body",
                $"{alert.RoomType} at {alert.HotelName} has only {alert.RemainingPct:F1}% capacity remaining for next month.");
            await cmd.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            logger.LogError("Failed to insert notification for {Hotel}: {Ex}", alert.HotelName, ex.Message);
        }
    }

    private sealed record CapacityAlert(
        string HotelName,
        string RoomType,
        string AdminEmail,
        double RemainingPct);
}
