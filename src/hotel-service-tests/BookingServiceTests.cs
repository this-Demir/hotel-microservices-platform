using HotelService.Data;
using HotelService.DTOs;
using HotelService.Models;
using HotelService.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using RabbitMQ.Client;

namespace HotelService.Tests;

/// <summary>
/// Replaces the SELECT FOR UPDATE raw SQL with an equivalent LINQ query
/// so the tests can run against EF Core InMemory without a real Postgres.
/// </summary>
file sealed class TestableBookingService : BookingService
{
    private readonly HotelDbContext _db;

    public TestableBookingService(HotelDbContext db, IConnection rabbit) : base(db, rabbit)
        => _db = db;

    protected override async Task<RoomAvailability?> GetAvailabilityForUpdateAsync(
        Guid roomId, DateOnly checkIn, DateOnly checkOut)
    {
        return await _db.RoomAvailabilities
            .Where(ra => ra.RoomId == roomId
                && ra.StartDate <= checkIn
                && ra.EndDate >= checkOut
                && ra.IsVacant)
            .FirstOrDefaultAsync();
    }
}

public class BookingServiceTests
{
    private static HotelDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<HotelDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            // InMemory doesn't support real transactions; suppress the warning so tests don't throw
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    private static IConnection MockRabbit()
    {
        var mockChannel = new Mock<IChannel>();
        mockChannel.Setup(c => c.DisposeAsync()).Returns(ValueTask.CompletedTask);

        var mockConnection = new Mock<IConnection>();
        mockConnection
            .Setup(c => c.CreateChannelAsync(
                It.IsAny<CreateChannelOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockChannel.Object);

        return mockConnection.Object;
    }

    private static async Task<(Hotel hotel, Room room, RoomAvailability avail)> SeedAsync(
        HotelDbContext db, int totalCapacity = 3, int reservedCount = 0, decimal basePrice = 100m)
    {
        var hotel = new Hotel
        {
            Id = Guid.NewGuid(),
            Name = "Sea View",
            LocationPoint = "36.0,28.0",
            Description = "desc",
            AdminEmail = "admin@sv.com",
        };
        var room = new Room
        {
            Id = Guid.NewGuid(),
            HotelId = hotel.Id,
            RoomType = "Deluxe",
            BasePrice = basePrice,
            Hotel = hotel,
        };
        var avail = new RoomAvailability
        {
            Id = Guid.NewGuid(),
            RoomId = room.Id,
            StartDate = new DateOnly(2026, 7, 1),
            EndDate = new DateOnly(2026, 7, 31),
            IsVacant = true,
            TotalCapacity = totalCapacity,
            ReservedCount = reservedCount,
            Room = room,
        };

        db.Hotels.Add(hotel);
        db.Rooms.Add(room);
        db.RoomAvailabilities.Add(avail);
        await db.SaveChangesAsync();
        return (hotel, room, avail);
    }

    private static BookRoomRequest DefaultRequest(Guid roomId) =>
        new(roomId, new DateOnly(2026, 7, 10), new DateOnly(2026, 7, 12), GuestCount: 2); // 2 nights

    // ── Capacity & IsVacant ───────────────────────────────────────────────────

    [Fact]
    public async Task BookRoom_Increments_ReservedCount()
    {
        await using var db = CreateDb();
        var (_, room, _) = await SeedAsync(db, totalCapacity: 3);
        var svc = new TestableBookingService(db, MockRabbit());

        await svc.BookRoomAsync(DefaultRequest(room.Id), "user1", "u1@mail.com", isAuthenticated: false);

        var avail = await db.RoomAvailabilities.FirstAsync();
        Assert.Equal(1, avail.ReservedCount);
        Assert.True(avail.IsVacant); // still has capacity
    }

    [Fact]
    public async Task BookRoom_LastSeat_Flips_IsVacant_To_False()
    {
        await using var db = CreateDb();
        var (_, room, _) = await SeedAsync(db, totalCapacity: 1, reservedCount: 0);
        var svc = new TestableBookingService(db, MockRabbit());

        await svc.BookRoomAsync(DefaultRequest(room.Id), "user1", "u1@mail.com", isAuthenticated: false);

        var avail = await db.RoomAvailabilities.FirstAsync();
        Assert.Equal(1, avail.ReservedCount);
        Assert.False(avail.IsVacant);
    }

    [Fact]
    public async Task BookRoom_NoAvailability_Throws_InvalidOperationException()
    {
        await using var db = CreateDb();
        // Room availability is marked not vacant
        var (_, room, avail) = await SeedAsync(db);
        avail.IsVacant = false;
        await db.SaveChangesAsync();

        var svc = new TestableBookingService(db, MockRabbit());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.BookRoomAsync(DefaultRequest(room.Id), "user1", "u1@mail.com", false));
    }

    // ── Pricing ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task BookRoom_Anonymous_Charges_Full_Price()
    {
        await using var db = CreateDb();
        var (_, room, _) = await SeedAsync(db, basePrice: 100m);
        var svc = new TestableBookingService(db, MockRabbit());

        // 2 nights at 100 = 200
        var response = await svc.BookRoomAsync(
            DefaultRequest(room.Id), "user1", "u1@mail.com", isAuthenticated: false);

        Assert.Equal(200m, response.PricePaid);
    }

    [Fact]
    public async Task BookRoom_Authenticated_Applies_15_Percent_Discount()
    {
        await using var db = CreateDb();
        var (_, room, _) = await SeedAsync(db, basePrice: 100m);
        var svc = new TestableBookingService(db, MockRabbit());

        // 2 nights at 100 * 0.85 = 170
        var response = await svc.BookRoomAsync(
            DefaultRequest(room.Id), "user1", "u1@mail.com", isAuthenticated: true);

        Assert.Equal(170m, response.PricePaid);
    }

    // ── Reservation list ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetUserReservations_Only_Returns_Own_Reservations()
    {
        await using var db = CreateDb();
        var (_, room, _) = await SeedAsync(db, totalCapacity: 5);
        var svc = new TestableBookingService(db, MockRabbit());

        await svc.BookRoomAsync(DefaultRequest(room.Id), "alice", "alice@mail.com", false);
        await svc.BookRoomAsync(DefaultRequest(room.Id), "bob", "bob@mail.com", false);
        await svc.BookRoomAsync(DefaultRequest(room.Id), "alice", "alice@mail.com", false);

        var aliceResult = await svc.GetUserReservationsAsync("alice", page: 1, pageSize: 10);
        var bobResult = await svc.GetUserReservationsAsync("bob", page: 1, pageSize: 10);

        Assert.Equal(2, aliceResult.TotalCount);
        Assert.Equal(1, bobResult.TotalCount);
        Assert.All(aliceResult.Items, r => Assert.Equal("alice", db.Reservations
            .First(res => res.Id == r.Id).UserId));
    }

    [Fact]
    public async Task GetUserReservations_Returns_Paginated()
    {
        await using var db = CreateDb();
        var (_, room, _) = await SeedAsync(db, totalCapacity: 10);
        var svc = new TestableBookingService(db, MockRabbit());

        for (var i = 0; i < 5; i++)
            await svc.BookRoomAsync(DefaultRequest(room.Id), "user1", "u1@mail.com", false);

        var page1 = await svc.GetUserReservationsAsync("user1", page: 1, pageSize: 3);
        var page2 = await svc.GetUserReservationsAsync("user1", page: 2, pageSize: 3);

        Assert.Equal(5, page1.TotalCount);
        Assert.Equal(3, page1.Items.Count());
        Assert.Equal(2, page2.Items.Count());
    }
}
