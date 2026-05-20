using System.Net.Http.Headers;
using HotelService.Data;
using HotelService.DTOs;
using HotelService.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Services;

public class HotelAdminService(
    HotelDbContext db,
    IHttpClientFactory httpClientFactory,
    IConfiguration config) : IHotelAdminService
{
    public async Task<HotelResponse> CreateHotelAsync(CreateHotelRequest request)
    {
        var hotel = new Hotel
        {
            Name = request.Name,
            LocationPoint = request.LocationPoint,
            Description = request.Description,
            AdminEmail = request.AdminEmail,
            AdminSub = request.AdminSub,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
        };
        db.Hotels.Add(hotel);
        await db.SaveChangesAsync();
        return ToResponse(hotel);
    }

    public async Task<HotelResponse?> UpdateHotelAsync(Guid id, UpdateHotelRequest request)
    {
        var hotel = await db.Hotels.FindAsync(id);
        if (hotel is null) return null;
        hotel.Name = request.Name;
        hotel.LocationPoint = request.LocationPoint;
        hotel.Description = request.Description;
        hotel.AdminEmail = request.AdminEmail;
        hotel.AdminSub = request.AdminSub;
        hotel.Latitude = request.Latitude;
        hotel.Longitude = request.Longitude;
        await db.SaveChangesAsync();
        return ToResponse(hotel);
    }

    public async Task<bool> DeleteHotelAsync(Guid id)
    {
        var hotel = await db.Hotels.FindAsync(id);
        if (hotel is null) return false;
        db.Hotels.Remove(hotel);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<HotelResponse?> GetHotelAsync(Guid id)
    {
        var hotel = await db.Hotels.FindAsync(id);
        return hotel is null ? null : ToResponse(hotel);
    }

    public async Task<PagedResult<HotelResponse>> GetHotelsAsync(int page, int pageSize)
    {
        var total = await db.Hotels.CountAsync();
        var items = await db.Hotels
            .OrderBy(h => h.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => ToResponse(h))
            .ToListAsync();
        return new PagedResult<HotelResponse>(items, page, pageSize, total);
    }

    public async Task<IEnumerable<HotelImageResponse>> GetHotelImagesAsync(Guid hotelId)
    {
        return await db.HotelImages
            .Where(i => i.HotelId == hotelId)
            .OrderBy(i => i.CreatedAt)
            .Select(i => new HotelImageResponse(i.Id, i.HotelId, i.Title, i.ImageUrl, i.CreatedAt))
            .ToListAsync();
    }

    public async Task<HotelImageResponse> UploadHotelImageAsync(Guid hotelId, UploadImageRequest request)
    {
        var hotel = await db.Hotels.FindAsync(hotelId)
            ?? throw new KeyNotFoundException("Hotel not found.");

        var supabaseUrl = config["Supabase:Url"]!;
        var serviceKey = config["Supabase:ServiceRoleKey"]!;
        var bucket = config["Supabase:StorageBucket"] ?? "hotel-images";
        var ext = request.ContentType switch
        {
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/png"                 => ".png",
            "image/webp"                => ".webp",
            "image/gif"                 => ".gif",
            _                           => ".bin",
        };
        var objectPath = $"hotels/{hotelId}/{request.Title}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";

        var bytes = Convert.FromBase64String(request.FileBase64);
        using var ms = new MemoryStream(bytes);
        using var content = new StreamContent(ms);
        content.Headers.ContentType = new MediaTypeHeaderValue(request.ContentType);

        var req = new HttpRequestMessage(HttpMethod.Post,
            $"{supabaseUrl}/storage/v1/object/{bucket}/{objectPath}")
        {
            Content = content,
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", serviceKey);
        req.Headers.Add("x-upsert", "true");

        var http = httpClientFactory.CreateClient();
        var response = await http.SendAsync(req);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException(
                $"Supabase storage upload failed ({(int)response.StatusCode}): {body}");
        }

        var imageUrl = $"{supabaseUrl}/storage/v1/object/public/{bucket}/{objectPath}";

        var image = new HotelImage { HotelId = hotelId, Title = request.Title, ImageUrl = imageUrl };
        db.HotelImages.Add(image);

        // first image becomes the cover used in search results
        if (hotel.ImageUrl is null)
            hotel.ImageUrl = imageUrl;

        await db.SaveChangesAsync();
        return new HotelImageResponse(image.Id, image.HotelId, image.Title, image.ImageUrl, image.CreatedAt);
    }

    public async Task<bool> DeleteHotelImageAsync(Guid imageId)
    {
        var image = await db.HotelImages.FindAsync(imageId);
        if (image is null) return false;

        db.HotelImages.Remove(image);

        // if deleted image was the cover, promote the next oldest image
        var hotel = await db.Hotels.FindAsync(image.HotelId);
        if (hotel is not null && hotel.ImageUrl == image.ImageUrl)
        {
            var next = await db.HotelImages
                .Where(i => i.HotelId == image.HotelId && i.Id != imageId)
                .OrderBy(i => i.CreatedAt)
                .FirstOrDefaultAsync();
            hotel.ImageUrl = next?.ImageUrl;
        }

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<RoomResponse> CreateRoomAsync(CreateRoomRequest request)
    {
        var room = new Room
        {
            HotelId = request.HotelId,
            RoomType = request.RoomType,
            BasePrice = request.BasePrice,
        };
        db.Rooms.Add(room);
        await db.SaveChangesAsync();
        return new RoomResponse(room.Id, room.HotelId, room.RoomType, room.BasePrice);
    }

    public async Task<RoomResponse?> UpdateRoomAsync(Guid id, UpdateRoomRequest request)
    {
        var room = await db.Rooms.FindAsync(id);
        if (room is null) return null;
        room.RoomType = request.RoomType;
        room.BasePrice = request.BasePrice;
        await db.SaveChangesAsync();
        return new RoomResponse(room.Id, room.HotelId, room.RoomType, room.BasePrice);
    }

    public async Task<bool> DeleteRoomAsync(Guid id)
    {
        var hasReservations = await db.Reservations.AnyAsync(r => r.RoomId == id);
        if (hasReservations) throw new InvalidOperationException("Room has active reservations and cannot be deleted.");
        var room = await db.Rooms.FindAsync(id);
        if (room is null) return false;
        db.Rooms.Remove(room);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<PagedResult<RoomResponse>> GetRoomsAsync(Guid hotelId, int page, int pageSize)
    {
        var query = db.Rooms.Where(r => r.HotelId == hotelId);
        var total = await query.CountAsync();
        var items = await query
            .OrderBy(r => r.RoomType)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RoomResponse(r.Id, r.HotelId, r.RoomType, r.BasePrice))
            .ToListAsync();
        return new PagedResult<RoomResponse>(items, page, pageSize, total);
    }

    public async Task<IEnumerable<AvailabilityResponse>> GetAvailabilityAsync(Guid roomId)
    {
        return await db.RoomAvailabilities
            .Where(ra => ra.RoomId == roomId)
            .OrderBy(ra => ra.StartDate)
            .Select(ra => new AvailabilityResponse(
                ra.Id, ra.RoomId, ra.StartDate, ra.EndDate,
                ra.IsVacant, ra.TotalCapacity, ra.ReservedCount))
            .ToListAsync();
    }

    public async Task<AvailabilityResponse> SetAvailabilityAsync(SetAvailabilityRequest request)
    {
        var existing = await db.RoomAvailabilities.FirstOrDefaultAsync(ra =>
            ra.RoomId == request.RoomId &&
            ra.StartDate == request.StartDate &&
            ra.EndDate == request.EndDate);

        if (existing is not null)
        {
            existing.IsVacant = request.IsVacant;
            existing.TotalCapacity = request.TotalCapacity;
        }
        else
        {
            existing = new RoomAvailability
            {
                RoomId = request.RoomId,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                IsVacant = request.IsVacant,
                TotalCapacity = request.TotalCapacity,
                ReservedCount = 0,
            };
            db.RoomAvailabilities.Add(existing);
        }

        await db.SaveChangesAsync();
        return new AvailabilityResponse(
            existing.Id, existing.RoomId,
            existing.StartDate, existing.EndDate,
            existing.IsVacant, existing.TotalCapacity, existing.ReservedCount);
    }

    public async Task<bool> DeleteAvailabilityAsync(Guid id)
    {
        var avail = await db.RoomAvailabilities.FindAsync(id);
        if (avail is null) return false;
        if (avail.ReservedCount > 0)
            throw new InvalidOperationException("Availability window has active reservations and cannot be deleted.");
        db.RoomAvailabilities.Remove(avail);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<PagedResult<AdminReservationResponse>> GetAllReservationsAsync(int page, int pageSize)
    {
        var query = db.Reservations
            .Include(r => r.Room).ThenInclude(r => r.Hotel)
            .OrderByDescending(r => r.CheckInDate);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new AdminReservationResponse(
                r.Id, r.UserId, r.Room.Hotel.Name, r.Room.RoomType,
                r.CheckInDate, r.CheckOutDate, r.GuestCount, r.PricePaid))
            .ToListAsync();

        return new PagedResult<AdminReservationResponse>(items, page, pageSize, total);
    }

    private static HotelResponse ToResponse(Hotel h) =>
        new(h.Id, h.Name, h.LocationPoint, h.Description, h.AdminEmail, h.ImageUrl, h.Latitude, h.Longitude, h.AdminSub);
}
