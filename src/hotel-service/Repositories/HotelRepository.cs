using HotelService.Data;
using HotelService.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Repositories;

public class HotelRepository(HotelDbContext db) : IHotelRepository
{
    public async Task<Hotel?> GetByIdAsync(Guid id) => await db.Hotels.FindAsync(id);

    public async Task<(IReadOnlyList<Hotel> Items, int Total)> GetPagedAsync(int page, int pageSize)
    {
        var total = await db.Hotels.CountAsync();
        var items = await db.Hotels
            .OrderBy(h => h.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return (items, total);
    }

    public async Task AddAsync(Hotel hotel)
    {
        db.Hotels.Add(hotel);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Hotel hotel)
    {
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Hotel hotel)
    {
        db.Hotels.Remove(hotel);
        await db.SaveChangesAsync();
    }
}
