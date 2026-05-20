using HotelService.Data;
using HotelService.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Repositories;

public class RoomRepository(HotelDbContext db) : IRoomRepository
{
    public async Task<Room?> GetByIdAsync(Guid id) => await db.Rooms.FindAsync(id);

    public async Task<Room?> GetByIdWithHotelAsync(Guid id) =>
        await db.Rooms.Include(r => r.Hotel).FirstOrDefaultAsync(r => r.Id == id);

    public async Task<(IReadOnlyList<Room> Items, int Total)> GetPagedByHotelAsync(
        Guid hotelId, int page, int pageSize)
    {
        var query = db.Rooms.Where(r => r.HotelId == hotelId);
        var total = await query.CountAsync();
        var items = await query
            .OrderBy(r => r.RoomType)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return (items, total);
    }

    public async Task AddAsync(Room room)
    {
        db.Rooms.Add(room);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Room room)
    {
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Room room)
    {
        db.Rooms.Remove(room);
        await db.SaveChangesAsync();
    }
}
