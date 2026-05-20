using HotelService.Data;
using HotelService.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Repositories;

public class ReservationRepository(HotelDbContext db) : IReservationRepository
{
    public async Task<Reservation> CreateBookingAsync(
        Guid roomId, string userId, DateOnly checkIn, DateOnly checkOut, int guestCount, decimal pricePaid)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        var availability = await GetAvailabilityForUpdateAsync(roomId, checkIn, checkOut)
            ?? throw new InvalidOperationException("Room not available for the requested dates.");

        if (availability.ReservedCount >= availability.TotalCapacity)
            throw new InvalidOperationException("Room is fully booked.");

        availability.ReservedCount++;
        if (availability.ReservedCount >= availability.TotalCapacity)
            availability.IsVacant = false;

        var reservation = new Reservation
        {
            RoomId = roomId,
            UserId = userId,
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            GuestCount = guestCount,
            PricePaid = pricePaid,
        };
        db.Reservations.Add(reservation);

        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        return reservation;
    }

    public async Task<(IReadOnlyList<Reservation> Items, int Total)> GetPagedByUserAsync(
        string userId, int page, int pageSize)
    {
        var query = db.Reservations
            .Include(r => r.Room).ThenInclude(r => r.Hotel)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CheckInDate);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<(IReadOnlyList<Reservation> Items, int Total)> GetAllPagedAsync(int page, int pageSize)
    {
        var query = db.Reservations
            .Include(r => r.Room).ThenInclude(r => r.Hotel)
            .OrderByDescending(r => r.CheckInDate);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public Task<bool> AnyByRoomAsync(Guid roomId) =>
        db.Reservations.AnyAsync(r => r.RoomId == roomId);

    // SELECT FOR UPDATE — kept behind a virtual so tests on EF InMemory can swap
    // to a plain LINQ query (InMemory does not support raw SQL or transactions).
    protected virtual async Task<RoomAvailability?> GetAvailabilityForUpdateAsync(
        Guid roomId, DateOnly checkIn, DateOnly checkOut)
    {
        return (await db.RoomAvailabilities
            .FromSqlInterpolated($"""
                SELECT * FROM "RoomAvailabilities"
                WHERE "RoomId" = {roomId}
                  AND "StartDate" <= {checkIn}
                  AND "EndDate" >= {checkOut}
                  AND "IsVacant" = true
                FOR UPDATE
                """)
            .ToListAsync())
            .FirstOrDefault();
    }
}
