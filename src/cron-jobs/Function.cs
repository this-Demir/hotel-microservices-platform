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
                h."AdminEmail",
                h."AdminSub"
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
            var adminSubOrdinal = reader.GetOrdinal("AdminSub");
            results.Add(new CapacityAlert(
                HotelName:      reader.GetString(reader.GetOrdinal("hotel_name")),
                RoomType:       reader.GetString(reader.GetOrdinal("RoomType")),
                AdminEmail:     reader.GetString(reader.GetOrdinal("AdminEmail")),
                AdminSub:       reader.IsDBNull(adminSubOrdinal) ? null : reader.GetString(adminSubOrdinal),
                RemainingPct:   100.0 * (total - reserved) / total));
        }

        return results;
    }

    private static async Task SendAlertEmailAsync(
        string apiKey, string from, CapacityAlert alert, ILambdaLogger logger)
    {
        var barWidth = (int)Math.Round(100 - alert.RemainingPct);
        var barColor = alert.RemainingPct < 15 ? "#dc2626" : "#f59e0b";
        var pctColor = alert.RemainingPct < 15 ? "#dc2626" : "#d97706";
        var html = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                    <tr><td style="background:linear-gradient(135deg,#b45309,#d97706);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
                      <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">StayEase Admin</div>
                      <div style="margin-top:6px;font-size:13px;color:#fde68a;letter-spacing:1px;text-transform:uppercase;">⚠ Capacity Alert</div>
                    </td></tr>
                    <tr><td style="background:#fff;padding:40px;">
                      <div style="text-align:center;margin-bottom:28px;">
                        <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">⚠</div>
                        <div style="margin-top:14px;font-size:22px;font-weight:700;color:#0f172a;">Low Availability Detected</div>
                        <div style="margin-top:6px;font-size:14px;color:#64748b;">Action may be required for next month.</div>
                      </div>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:12px;border:1px solid #fcd34d;overflow:hidden;margin-bottom:24px;">
                        <tr><td style="padding:20px 24px;border-bottom:1px solid #fde68a;">
                          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#92400e;">Property</div>
                          <div style="font-size:18px;font-weight:700;color:#0f172a;margin-top:4px;">{alert.HotelName}</div>
                          <div style="font-size:13px;color:#64748b;margin-top:2px;">{alert.RoomType}</div>
                        </td></tr>
                        <tr><td style="padding:20px 24px;">
                          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#92400e;margin-bottom:10px;">Remaining Capacity — Next Month</div>
                          <div style="background:#e5e7eb;border-radius:99px;height:12px;overflow:hidden;margin-bottom:8px;">
                            <div style="background:{barColor};height:12px;width:{barWidth}%;border-radius:99px;"></div>
                          </div>
                          <div style="font-size:28px;font-weight:800;color:{pctColor};margin-top:4px;">{alert.RemainingPct:F1}% remaining</div>
                        </td></tr>
                      </table>
                      <div style="text-align:center;margin-bottom:24px;">
                        <a href="https://hotel-admin-client.vercel.app" style="display:inline-block;background:#b45309;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:99px;text-decoration:none;">Open Admin Panel →</a>
                      </div>
                      <div style="font-size:13px;color:#94a3b8;text-align:center;">This alert was generated automatically by the StayEase nightly capacity checker.</div>
                    </td></tr>
                    <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                      <div style="font-size:12px;color:#94a3b8;">© 2026 StayEase · All rights reserved</div>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
        var payload = JsonSerializer.Serialize(new
        {
            from,
            to      = new[] { alert.AdminEmail },
            subject = $"Low Capacity Alert — {alert.HotelName}",
            html,
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
            cmd.Parameters.AddWithValue("@userId", alert.AdminSub ?? "");
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
        string? AdminSub,
        double RemainingPct);
}
