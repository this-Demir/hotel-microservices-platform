using System.Text.Json;
using HotelService.Data;
using HotelService.DTOs;
using HotelService.Models;
using HotelService.Repositories;
using HotelService.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using StackExchange.Redis;

namespace HotelService.Tests;

public class SearchServiceTests
{
    private static HotelDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<HotelDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (Mock<IConnectionMultiplexer>, Mock<IDatabase>) MakeCacheMiss()
    {
        var mockDb = new Mock<IDatabase>();
        mockDb
            .Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);
        mockDb
            .Setup(d => d.StringSetAsync(
                It.IsAny<RedisKey>(), It.IsAny<RedisValue>(),
                It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);

        var mockRedis = new Mock<IConnectionMultiplexer>();
        mockRedis.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object?>()))
            .Returns(mockDb.Object);

        return (mockRedis, mockDb);
    }

    private static SearchService Build(HotelDbContext db, IConnectionMultiplexer redis) =>
        new(new HotelRepository(db), new RoomRepository(db), new RoomAvailabilityRepository(db), redis);

    private static async Task<(Hotel hotel, Room room, RoomAvailability avail)> SeedAsync(
        HotelDbContext db, decimal basePrice = 200m, int totalCapacity = 5, int reservedCount = 0)
    {
        var hotel = new Hotel
        {
            Id = Guid.NewGuid(),
            Name = "Test Hotel",
            LocationPoint = "Istanbul",
            Description = "desc",
            AdminEmail = "admin@test.com",
        };
        var room = new Room
        {
            Id = Guid.NewGuid(),
            HotelId = hotel.Id,
            RoomType = "Standard",
            BasePrice = basePrice,
            Hotel = hotel,
        };
        var avail = new RoomAvailability
        {
            Id = Guid.NewGuid(),
            RoomId = room.Id,
            StartDate = new DateOnly(2026, 6, 1),
            EndDate = new DateOnly(2026, 6, 30),
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

    private static SearchRequest DefaultRequest(string? location = "Istanbul") =>
        new(location, new DateOnly(2026, 6, 10), new DateOnly(2026, 6, 15), GuestCount: 1);

    // ── Cache miss hits DB ────────────────────────────────────────────────────

    [Fact]
    public async Task Search_CacheMiss_Queries_Database()
    {
        await using var db = CreateDb();
        await SeedAsync(db);
        var (mockRedis, _) = MakeCacheMiss();
        var svc = Build(db, mockRedis.Object);

        var result = await svc.SearchAsync(DefaultRequest(), isAuthenticated: false);

        Assert.Equal(1, result.TotalCount);
    }

    [Fact]
    public async Task Search_CacheHit_Returns_Cached_Result_Without_DB()
    {
        await using var db = CreateDb();
        // DB is empty — result must come entirely from cache
        var fakeResult = new PagedResult<SearchResultItem>(
            [new SearchResultItem(Guid.NewGuid(), Guid.NewGuid(), "Cached Hotel", "X", null, "Suite", 150m)],
            1, 10, 1);

        var mockDbRedis = new Mock<IDatabase>();
        mockDbRedis
            .Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(new RedisValue(JsonSerializer.Serialize(fakeResult)));

        var mockRedis = new Mock<IConnectionMultiplexer>();
        mockRedis.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object?>()))
            .Returns(mockDbRedis.Object);

        var svc = Build(db, mockRedis.Object);
        var result = await svc.SearchAsync(DefaultRequest(), isAuthenticated: false);

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("Cached Hotel", result.Items.Single().HotelName);
    }

    // ── Discount logic ────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_Authenticated_Applies_15_Percent_Discount()
    {
        await using var db = CreateDb();
        await SeedAsync(db, basePrice: 200m);
        var (mockRedis, _) = MakeCacheMiss();
        var svc = Build(db, mockRedis.Object);

        var result = await svc.SearchAsync(DefaultRequest(), isAuthenticated: true);

        Assert.Equal(170m, result.Items.Single().Price); // 200 * 0.85
    }

    [Fact]
    public async Task Search_Anonymous_Returns_Full_Price()
    {
        await using var db = CreateDb();
        await SeedAsync(db, basePrice: 200m);
        var (mockRedis, _) = MakeCacheMiss();
        var svc = Build(db, mockRedis.Object);

        var result = await svc.SearchAsync(DefaultRequest(), isAuthenticated: false);

        Assert.Equal(200m, result.Items.Single().Price);
    }

    [Fact]
    public async Task Search_NoVacantRooms_Returns_Empty()
    {
        await using var db = CreateDb();
        await SeedAsync(db, totalCapacity: 1, reservedCount: 1);
        var avail = await db.RoomAvailabilities.FirstAsync();
        avail.IsVacant = false;
        await db.SaveChangesAsync();

        var (mockRedis, _) = MakeCacheMiss();
        var svc = Build(db, mockRedis.Object);

        var result = await svc.SearchAsync(DefaultRequest(), isAuthenticated: false);

        Assert.Equal(0, result.TotalCount);
    }

    // ── Room detail ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetRoomDetail_Authenticated_Applies_Discount()
    {
        await using var db = CreateDb();
        var (_, room, _) = await SeedAsync(db, basePrice: 300m);
        var (mockRedis, _) = MakeCacheMiss();
        var svc = Build(db, mockRedis.Object);

        var detail = await svc.GetRoomDetailAsync(room.Id, isAuthenticated: true);

        Assert.NotNull(detail);
        Assert.Equal(255m, detail.Price); // 300 * 0.85
    }

    [Fact]
    public async Task GetRoomDetail_Anonymous_Returns_Full_Price()
    {
        await using var db = CreateDb();
        var (_, room, _) = await SeedAsync(db, basePrice: 300m);
        var (mockRedis, _) = MakeCacheMiss();
        var svc = Build(db, mockRedis.Object);

        var detail = await svc.GetRoomDetailAsync(room.Id, isAuthenticated: false);

        Assert.NotNull(detail);
        Assert.Equal(300m, detail.Price);
    }

    [Fact]
    public async Task GetRoomDetail_NotFound_Returns_Null()
    {
        await using var db = CreateDb();
        var (mockRedis, _) = MakeCacheMiss();
        var svc = Build(db, mockRedis.Object);

        var result = await svc.GetRoomDetailAsync(Guid.NewGuid(), isAuthenticated: false);

        Assert.Null(result);
    }
}
