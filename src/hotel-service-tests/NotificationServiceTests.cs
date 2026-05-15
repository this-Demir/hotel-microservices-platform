using HotelService.Data;
using HotelService.Models;
using HotelService.Services;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Tests;

public class NotificationServiceTests
{
    private static HotelDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<HotelDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Notification MakeNotification(string userId, bool isRead = false) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Title = "Booking Confirmed",
        Body = "Your booking is confirmed.",
        IsRead = isRead,
        CreatedAt = DateTime.UtcNow,
    };

    // ── Query scoping ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetNotifications_Only_Returns_For_UserId()
    {
        await using var db = CreateDb();
        db.Notifications.AddRange(
            MakeNotification("alice"),
            MakeNotification("alice"),
            MakeNotification("bob"));
        await db.SaveChangesAsync();

        var svc = new NotificationService(db);
        var result = await svc.GetNotificationsAsync("alice", page: 1, pageSize: 10);

        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, n => Assert.NotEqual(Guid.Empty, n.Id));
    }

    [Fact]
    public async Task GetNotifications_Returns_Paginated()
    {
        await using var db = CreateDb();
        for (var i = 0; i < 5; i++)
            db.Notifications.Add(MakeNotification("alice"));
        await db.SaveChangesAsync();

        var svc = new NotificationService(db);
        var page1 = await svc.GetNotificationsAsync("alice", page: 1, pageSize: 3);
        var page2 = await svc.GetNotificationsAsync("alice", page: 2, pageSize: 3);

        Assert.Equal(5, page1.TotalCount);
        Assert.Equal(3, page1.Items.Count());
        Assert.Equal(2, page2.Items.Count());
    }

    // ── Mark as read ──────────────────────────────────────────────────────────

    [Fact]
    public async Task MarkAsRead_Sets_IsRead_True()
    {
        await using var db = CreateDb();
        var notification = MakeNotification("alice", isRead: false);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        var svc = new NotificationService(db);
        await svc.MarkAsReadAsync(notification.Id, "alice");

        var updated = await db.Notifications.FindAsync(notification.Id);
        Assert.True(updated!.IsRead);
    }

    [Fact]
    public async Task MarkAsRead_Wrong_UserId_Does_Nothing()
    {
        await using var db = CreateDb();
        var notification = MakeNotification("alice", isRead: false);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        var svc = new NotificationService(db);
        await svc.MarkAsReadAsync(notification.Id, "eve"); // wrong user

        var unchanged = await db.Notifications.FindAsync(notification.Id);
        Assert.False(unchanged!.IsRead);
    }

    [Fact]
    public async Task MarkAsRead_NonExistent_Id_Does_Not_Throw()
    {
        await using var db = CreateDb();
        var svc = new NotificationService(db);

        var exception = await Record.ExceptionAsync(
            () => svc.MarkAsReadAsync(Guid.NewGuid(), "alice"));

        Assert.Null(exception);
    }
}
