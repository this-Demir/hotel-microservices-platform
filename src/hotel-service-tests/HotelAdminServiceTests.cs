using HotelService.Data;
using HotelService.DTOs;
using HotelService.Models;
using HotelService.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;

namespace HotelService.Tests;

public class HotelAdminServiceTests
{
    private static HotelDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HotelDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new HotelDbContext(options);
    }

    private static HotelAdminService CreateService(HotelDbContext db)
    {
        var config = new Mock<IConfiguration>();
        var httpFactory = new Mock<IHttpClientFactory>();
        return new HotelAdminService(db, httpFactory.Object, config.Object);
    }

    // ── Hotels ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateHotel_Returns_HotelResponse_With_Correct_Fields()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);

        var result = await svc.CreateHotelAsync(
            new CreateHotelRequest("Grand Palace", "41.0,29.0", "Luxury hotel", "admin@gp.com"));

        Assert.Equal("Grand Palace", result.Name);
        Assert.Equal("admin@gp.com", result.AdminEmail);
        Assert.NotEqual(Guid.Empty, result.Id);
    }

    [Fact]
    public async Task UpdateHotel_ExistingId_Returns_Updated()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);
        var created = await svc.CreateHotelAsync(
            new CreateHotelRequest("Old Name", "0,0", "desc", "old@hotel.com"));

        var updated = await svc.UpdateHotelAsync(created.Id,
            new UpdateHotelRequest("New Name", "1,1", "new desc", "new@hotel.com"));

        Assert.NotNull(updated);
        Assert.Equal("New Name", updated.Name);
        Assert.Equal("new@hotel.com", updated.AdminEmail);
    }

    [Fact]
    public async Task UpdateHotel_NotFound_Returns_Null()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);

        var result = await svc.UpdateHotelAsync(Guid.NewGuid(),
            new UpdateHotelRequest("X", "0,0", "x", "x@x.com"));

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteHotel_ExistingId_Returns_True_And_Removes()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);
        var hotel = await svc.CreateHotelAsync(
            new CreateHotelRequest("To Delete", "0,0", "desc", "a@a.com"));

        var deleted = await svc.DeleteHotelAsync(hotel.Id);
        var fetched = await svc.GetHotelAsync(hotel.Id);

        Assert.True(deleted);
        Assert.Null(fetched);
    }

    [Fact]
    public async Task DeleteHotel_NotFound_Returns_False()
    {
        await using var db = CreateDb();
        var result = await CreateService(db).DeleteHotelAsync(Guid.NewGuid());
        Assert.False(result);
    }

    [Fact]
    public async Task GetHotels_Returns_Paged_Results()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);
        await svc.CreateHotelAsync(new CreateHotelRequest("A", "0,0", "d", "a@a.com"));
        await svc.CreateHotelAsync(new CreateHotelRequest("B", "0,0", "d", "b@b.com"));
        await svc.CreateHotelAsync(new CreateHotelRequest("C", "0,0", "d", "c@c.com"));

        var page1 = await svc.GetHotelsAsync(page: 1, pageSize: 2);
        var page2 = await svc.GetHotelsAsync(page: 2, pageSize: 2);

        Assert.Equal(3, page1.TotalCount);
        Assert.Equal(2, page1.Items.Count());
        Assert.Single(page2.Items);
    }

    // ── Rooms ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateRoom_Returns_RoomResponse()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);
        var hotel = await svc.CreateHotelAsync(
            new CreateHotelRequest("H", "0,0", "d", "a@a.com"));

        var room = await svc.CreateRoomAsync(new CreateRoomRequest(hotel.Id, "Standard", 100m));

        Assert.Equal(hotel.Id, room.HotelId);
        Assert.Equal("Standard", room.RoomType);
        Assert.Equal(100m, room.BasePrice);
    }

    [Fact]
    public async Task GetRooms_Only_Returns_Rooms_For_HotelId()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);
        var h1 = await svc.CreateHotelAsync(new CreateHotelRequest("H1", "0,0", "d", "a@a.com"));
        var h2 = await svc.CreateHotelAsync(new CreateHotelRequest("H2", "0,0", "d", "b@b.com"));
        await svc.CreateRoomAsync(new CreateRoomRequest(h1.Id, "Standard", 100m));
        await svc.CreateRoomAsync(new CreateRoomRequest(h1.Id, "Family", 200m));
        await svc.CreateRoomAsync(new CreateRoomRequest(h2.Id, "Suite", 300m));

        var rooms = await svc.GetRoomsAsync(h1.Id, page: 1, pageSize: 10);

        Assert.Equal(2, rooms.TotalCount);
        Assert.All(rooms.Items, r => Assert.Equal(h1.Id, r.HotelId));
    }

    // ── Availability ─────────────────────────────────────────────────────────

    [Fact]
    public async Task SetAvailability_NewRecord_Creates_Entry()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);
        var hotel = await svc.CreateHotelAsync(
            new CreateHotelRequest("H", "0,0", "d", "a@a.com"));
        var room = await svc.CreateRoomAsync(new CreateRoomRequest(hotel.Id, "Standard", 100m));
        var start = new DateOnly(2026, 6, 1);
        var end = new DateOnly(2026, 6, 30);

        var result = await svc.SetAvailabilityAsync(
            new SetAvailabilityRequest(room.Id, start, end, true, 5));

        Assert.Equal(room.Id, result.RoomId);
        Assert.Equal(5, result.TotalCapacity);
        Assert.Equal(0, result.ReservedCount);
        Assert.True(result.IsVacant);
    }

    [Fact]
    public async Task SetAvailability_ExistingRecord_Updates_In_Place()
    {
        await using var db = CreateDb();
        var svc = CreateService(db);
        var hotel = await svc.CreateHotelAsync(
            new CreateHotelRequest("H", "0,0", "d", "a@a.com"));
        var room = await svc.CreateRoomAsync(new CreateRoomRequest(hotel.Id, "Standard", 100m));
        var start = new DateOnly(2026, 6, 1);
        var end = new DateOnly(2026, 6, 30);

        await svc.SetAvailabilityAsync(new SetAvailabilityRequest(room.Id, start, end, true, 5));
        var updated = await svc.SetAvailabilityAsync(
            new SetAvailabilityRequest(room.Id, start, end, false, 10));

        Assert.Equal(10, updated.TotalCapacity);
        Assert.False(updated.IsVacant);
        Assert.Equal(1, await db.RoomAvailabilities.CountAsync());
    }
}
