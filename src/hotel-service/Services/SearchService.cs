using System.Text.Json;
using HotelService.Data;
using HotelService.DTOs;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace HotelService.Services;

public class SearchService(HotelDbContext db, IConnectionMultiplexer redis) : ISearchService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<PagedResult<SearchResultItem>> SearchAsync(SearchRequest request, bool isAuthenticated)
    {
        var cacheKey = $"search:{request.Location}:{request.CheckIn:O}:{request.CheckOut:O}" +
                       $":{request.GuestCount}:{request.Page}:{request.PageSize}:{isAuthenticated}";

        var cache = redis.GetDatabase();
        var cached = await cache.StringGetAsync(cacheKey);
        if (cached.HasValue)
            return JsonSerializer.Deserialize<PagedResult<SearchResultItem>>(cached!)!;

        var query = db.RoomAvailabilities
            .Include(ra => ra.Room).ThenInclude(r => r.Hotel)
            .Where(ra =>
                ra.IsVacant &&
                ra.StartDate <= request.CheckIn &&
                ra.EndDate >= request.CheckOut &&
                (ra.TotalCapacity - ra.ReservedCount) >= request.GuestCount);

        if (!string.IsNullOrWhiteSpace(request.Location))
            query = query.Where(ra => ra.Room.Hotel.LocationPoint.Contains(request.Location));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(ra => ra.Room.BasePrice)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(ra => new SearchResultItem(
                ra.RoomId,
                ra.Room.HotelId,
                ra.Room.Hotel.Name,
                ra.Room.Hotel.LocationPoint,
                ra.Room.Hotel.ImageUrl,
                ra.Room.RoomType,
                isAuthenticated
                    ? Math.Round(ra.Room.BasePrice * 0.85m, 2)
                    : ra.Room.BasePrice))
            .ToListAsync();

        var result = new PagedResult<SearchResultItem>(items, request.Page, request.PageSize, total);
        await cache.StringSetAsync(cacheKey, JsonSerializer.Serialize(result), CacheTtl);
        return result;
    }

    public async Task<RoomDetailResponse?> GetRoomDetailAsync(Guid roomId, bool isAuthenticated)
    {
        var room = await db.Rooms
            .Include(r => r.Hotel)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (room is null) return null;

        var price = isAuthenticated
            ? Math.Round(room.BasePrice * 0.85m, 2)
            : room.BasePrice;

        return new RoomDetailResponse(
            room.Id, room.HotelId, room.Hotel.Name, room.Hotel.LocationPoint,
            room.Hotel.ImageUrl, room.RoomType, price);
    }
}
