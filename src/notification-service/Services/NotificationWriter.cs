using Npgsql;

namespace NotificationService.Services;

public class NotificationWriter(NpgsqlDataSource dataSource) : INotificationWriter
{
    public async Task WriteAsync(string userId, string title, string body)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO "Notifications" ("Id", "UserId", "Title", "Body", "IsRead", "CreatedAt")
            VALUES (@id, @userId, @title, @body, false, now())
            """;
        cmd.Parameters.AddWithValue("@id", Guid.NewGuid());
        cmd.Parameters.AddWithValue("@userId", userId);
        cmd.Parameters.AddWithValue("@title", title);
        cmd.Parameters.AddWithValue("@body", body);
        await cmd.ExecuteNonQueryAsync();
    }
}
