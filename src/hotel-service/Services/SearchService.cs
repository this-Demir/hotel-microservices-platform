using System.Text.Json;
using HotelService.DTOs;
using HotelService.Repositories;
using StackExchange.Redis;

namespace HotelService.Services;

public class SearchService(
    IHotelRepository hotelRepo,
    IRoomRepository roomRepo,
    IRoomAvailabilityRepository availabilityRepo,
    IConnectionMultiplexer redis) : ISearchService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<PagedResult<SearchResultItem>> SearchAsync(SearchRequest request, bool isAuthenticated)
    {
        var checkIn  = request.ResolvedCheckIn;
        var checkOut = request.ResolvedCheckOut;

        var cacheKey = $"search:{request.Location}:{checkIn:O}:{checkOut:O}" +
                       $":{request.GuestCount}:{request.Page}:{request.PageSize}:{isAuthenticated}";

        IDatabase? cache = null;
        try
        {
            cache = redis.GetDatabase();
            var cached = await cache.StringGetAsync(cacheKey);
            if (cached.HasValue)
                return JsonSerializer.Deserialize<PagedResult<SearchResultItem>>(cached!)!;
        }
        catch { /* Redis unavailable — fall through to DB */ }

        var (items, total) = await availabilityRepo.SearchAsync(
            request.Location, checkIn, checkOut, request.GuestCount, request.Page, request.PageSize);

        var dtos = items.Select(ra => new SearchResultItem(
            ra.RoomId,
            ra.Room.HotelId,
            ra.Room.Hotel.Name,
            ra.Room.Hotel.LocationPoint,
            ra.Room.Hotel.ImageUrl,
            ra.Room.RoomType,
            isAuthenticated ? Math.Round(ra.Room.BasePrice * 0.85m, 2) : ra.Room.BasePrice,
            ra.Room.Hotel.Latitude,
            ra.Room.Hotel.Longitude));

        var result = new PagedResult<SearchResultItem>(dtos, request.Page, request.PageSize, total);
        try { if (cache is not null) await cache.StringSetAsync(cacheKey, JsonSerializer.Serialize(result), CacheTtl); }
        catch { /* Redis unavailable — skip cache write */ }
        return result;
    }

    public async Task<RoomDetailResponse?> GetRoomDetailAsync(Guid roomId, bool isAuthenticated)
    {
        var room = await roomRepo.GetByIdWithHotelAsync(roomId);
        if (room is null) return null;

        var price = isAuthenticated ? Math.Round(room.BasePrice * 0.85m, 2) : room.BasePrice;
        return new RoomDetailResponse(
            room.Id, room.HotelId, room.Hotel.Name, room.Hotel.LocationPoint,
            room.Hotel.ImageUrl, room.RoomType, price, room.Hotel.Latitude, room.Hotel.Longitude);
    }

    public async Task<HotelDetailResponse?> GetHotelDetailAsync(Guid hotelId, bool isAuthenticated)
    {
        var hotel = await hotelRepo.GetByIdAsync(hotelId);
        if (hotel is null) return null;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var availabilities = await availabilityRepo.GetVacantByHotelAsync(hotelId, today);

        var rooms = availabilities
            .Select(ra => new SearchResultItem(
                ra.RoomId, hotelId, hotel.Name, hotel.LocationPoint, hotel.ImageUrl, ra.Room.RoomType,
                isAuthenticated ? Math.Round(ra.Room.BasePrice * 0.85m, 2) : ra.Room.BasePrice,
                hotel.Latitude, hotel.Longitude))
            .DistinctBy(x => x.RoomId);

        return new HotelDetailResponse(hotel.Id, hotel.Name, hotel.LocationPoint, hotel.Description, hotel.ImageUrl, rooms);
    }
}
