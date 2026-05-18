using System.Net.Http.Headers;
using HotelService.Data;
using HotelService.DTOs;
using HotelService.Models;
using Microsoft.AspNetCore.Http;
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

    public async Task<HotelResponse?> UploadHotelImageAsync(Guid id, IFormFile file)
    {
        var hotel = await db.Hotels.FindAsync(id);
        if (hotel is null) return null;

        var supabaseUrl = config["Supabase:Url"]!;
        var serviceKey = config["Supabase:ServiceRoleKey"]!;
        var bucket = config["Supabase:StorageBucket"] ?? "hotel-images";
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var objectPath = $"hotels/{id}/cover{ext}";

        using var content = new StreamContent(file.OpenReadStream());
        content.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);

        var req = new HttpRequestMessage(HttpMethod.Post,
            $"{supabaseUrl}/storage/v1/object/{bucket}/{objectPath}")
        {
            Content = content,
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", serviceKey);
        req.Headers.Add("x-upsert", "true");

        var http = httpClientFactory.CreateClient();
        var response = await http.SendAsync(req);
        response.EnsureSuccessStatusCode();

        hotel.ImageUrl = $"{supabaseUrl}/storage/v1/object/public/{bucket}/{objectPath}";
        await db.SaveChangesAsync();
        return ToResponse(hotel);
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

    private static HotelResponse ToResponse(Hotel h) =>
        new(h.Id, h.Name, h.LocationPoint, h.Description, h.AdminEmail, h.ImageUrl);
}
