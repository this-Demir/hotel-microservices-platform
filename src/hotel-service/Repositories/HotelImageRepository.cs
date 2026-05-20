using HotelService.Data;
using HotelService.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Repositories;

public class HotelImageRepository(HotelDbContext db) : IHotelImageRepository
{
    public async Task<IReadOnlyList<HotelImage>> GetByHotelAsync(Guid hotelId) =>
        await db.HotelImages
            .Where(i => i.HotelId == hotelId)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();

    public async Task<HotelImage?> GetByIdAsync(Guid id) =>
        await db.HotelImages.FindAsync(id);

    public async Task<HotelImage?> GetOldestByHotelExcludingAsync(Guid hotelId, Guid excludeId) =>
        await db.HotelImages
            .Where(i => i.HotelId == hotelId && i.Id != excludeId)
            .OrderBy(i => i.CreatedAt)
            .FirstOrDefaultAsync();

    public async Task AddAsync(HotelImage image)
    {
        db.HotelImages.Add(image);
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(HotelImage image)
    {
        db.HotelImages.Remove(image);
        await db.SaveChangesAsync();
    }
}
