using HotelService.Data;
using HotelService.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Repositories;

public class RoomAvailabilityRepository(HotelDbContext db) : IRoomAvailabilityRepository
{
    public async Task<(IReadOnlyList<RoomAvailability> Items, int Total)> SearchAsync(
        string? location, DateOnly checkIn, DateOnly checkOut, int guestCount, int page, int pageSize)
    {
        var query = db.RoomAvailabilities
            .Include(ra => ra.Room).ThenInclude(r => r.Hotel)
            .Where(ra =>
                ra.IsVacant &&
                ra.StartDate <= checkIn &&
                ra.EndDate >= checkOut &&
                (ra.TotalCapacity - ra.ReservedCount) >= guestCount);

        if (!string.IsNullOrWhiteSpace(location))
            query = query.Where(ra => ra.Room.Hotel.LocationPoint.Contains(location));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(ra => ra.Room.BasePrice)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<IReadOnlyList<RoomAvailability>> GetVacantByHotelAsync(Guid hotelId, DateOnly fromDate)
    {
        return await db.RoomAvailabilities
            .Include(ra => ra.Room)
            .Where(ra => ra.Room.HotelId == hotelId && ra.IsVacant && ra.EndDate >= fromDate)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<RoomAvailability>> GetByRoomAsync(Guid roomId)
    {
        return await db.RoomAvailabilities
            .Where(ra => ra.RoomId == roomId)
            .OrderBy(ra => ra.StartDate)
            .ToListAsync();
    }

    public async Task<RoomAvailability?> GetByIdAsync(Guid id) =>
        await db.RoomAvailabilities.FindAsync(id);

    public async Task<RoomAvailability?> GetByRoomAndDatesAsync(
        Guid roomId, DateOnly startDate, DateOnly endDate) =>
        await db.RoomAvailabilities.FirstOrDefaultAsync(ra =>
            ra.RoomId == roomId && ra.StartDate == startDate && ra.EndDate == endDate);

    public async Task AddAsync(RoomAvailability availability)
    {
        db.RoomAvailabilities.Add(availability);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(RoomAvailability availability)
    {
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(RoomAvailability availability)
    {
        db.RoomAvailabilities.Remove(availability);
        await db.SaveChangesAsync();
    }
}
