using System.Net.Http.Headers;
using HotelService.DTOs;
using HotelService.Models;
using HotelService.Repositories;

namespace HotelService.Services;

public class HotelAdminService(
    IHotelRepository hotelRepo,
    IHotelImageRepository imageRepo,
    IRoomRepository roomRepo,
    IRoomAvailabilityRepository availabilityRepo,
    IReservationRepository reservationRepo,
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
        await hotelRepo.AddAsync(hotel);
        return ToResponse(hotel);
    }

    public async Task<HotelResponse?> UpdateHotelAsync(Guid id, UpdateHotelRequest request)
    {
        var hotel = await hotelRepo.GetByIdAsync(id);
        if (hotel is null) return null;
        hotel.Name = request.Name;
        hotel.LocationPoint = request.LocationPoint;
        hotel.Description = request.Description;
        hotel.AdminEmail = request.AdminEmail;
        hotel.AdminSub = request.AdminSub;
        hotel.Latitude = request.Latitude;
        hotel.Longitude = request.Longitude;
        await hotelRepo.UpdateAsync(hotel);
        return ToResponse(hotel);
    }

    public async Task<bool> DeleteHotelAsync(Guid id)
    {
        var hotel = await hotelRepo.GetByIdAsync(id);
        if (hotel is null) return false;
        await hotelRepo.DeleteAsync(hotel);
        return true;
    }

    public async Task<HotelResponse?> GetHotelAsync(Guid id)
    {
        var hotel = await hotelRepo.GetByIdAsync(id);
        return hotel is null ? null : ToResponse(hotel);
    }

    public async Task<PagedResult<HotelResponse>> GetHotelsAsync(int page, int pageSize)
    {
        var (items, total) = await hotelRepo.GetPagedAsync(page, pageSize);
        return new PagedResult<HotelResponse>(items.Select(ToResponse), page, pageSize, total);
    }

    public async Task<IEnumerable<HotelImageResponse>> GetHotelImagesAsync(Guid hotelId)
    {
        var images = await imageRepo.GetByHotelAsync(hotelId);
        return images.Select(i => new HotelImageResponse(i.Id, i.HotelId, i.Title, i.ImageUrl, i.CreatedAt));
    }

    public async Task<HotelImageResponse> UploadHotelImageAsync(Guid hotelId, UploadImageRequest request)
    {
        var hotel = await hotelRepo.GetByIdAsync(hotelId)
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
            $"{supabaseUrl}/storage/v1/object/{bucket}/{objectPath}") { Content = content };
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

        // mutate tracked hotel before saving — EF batches both into one SaveChanges
        if (hotel.ImageUrl is null)
            hotel.ImageUrl = imageUrl;

        await imageRepo.AddAsync(image);
        return new HotelImageResponse(image.Id, image.HotelId, image.Title, image.ImageUrl, image.CreatedAt);
    }

    public async Task<bool> DeleteHotelImageAsync(Guid imageId)
    {
        var image = await imageRepo.GetByIdAsync(imageId);
        if (image is null) return false;

        var hotel = await hotelRepo.GetByIdAsync(image.HotelId);
        if (hotel is not null && hotel.ImageUrl == image.ImageUrl)
        {
            var next = await imageRepo.GetOldestByHotelExcludingAsync(image.HotelId, imageId);
            // mutate tracked hotel before deletion — EF batches both into one SaveChanges
            hotel.ImageUrl = next?.ImageUrl;
        }

        await imageRepo.DeleteAsync(image);
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
        await roomRepo.AddAsync(room);
        return new RoomResponse(room.Id, room.HotelId, room.RoomType, room.BasePrice);
    }

    public async Task<RoomResponse?> UpdateRoomAsync(Guid id, UpdateRoomRequest request)
    {
        var room = await roomRepo.GetByIdAsync(id);
        if (room is null) return null;
        room.RoomType = request.RoomType;
        room.BasePrice = request.BasePrice;
        await roomRepo.UpdateAsync(room);
        return new RoomResponse(room.Id, room.HotelId, room.RoomType, room.BasePrice);
    }

    public async Task<bool> DeleteRoomAsync(Guid id)
    {
        if (await reservationRepo.AnyByRoomAsync(id))
            throw new InvalidOperationException("Room has active reservations and cannot be deleted.");
        var room = await roomRepo.GetByIdAsync(id);
        if (room is null) return false;
        await roomRepo.DeleteAsync(room);
        return true;
    }

    public async Task<PagedResult<RoomResponse>> GetRoomsAsync(Guid hotelId, int page, int pageSize)
    {
        var (items, total) = await roomRepo.GetPagedByHotelAsync(hotelId, page, pageSize);
        return new PagedResult<RoomResponse>(
            items.Select(r => new RoomResponse(r.Id, r.HotelId, r.RoomType, r.BasePrice)),
            page, pageSize, total);
    }

    public async Task<IEnumerable<AvailabilityResponse>> GetAvailabilityAsync(Guid roomId)
    {
        var items = await availabilityRepo.GetByRoomAsync(roomId);
        return items.Select(ra => new AvailabilityResponse(
            ra.Id, ra.RoomId, ra.StartDate, ra.EndDate, ra.IsVacant, ra.TotalCapacity, ra.ReservedCount));
    }

    public async Task<AvailabilityResponse> SetAvailabilityAsync(SetAvailabilityRequest request)
    {
        var existing = await availabilityRepo.GetByRoomAndDatesAsync(
            request.RoomId, request.StartDate, request.EndDate);

        if (existing is not null)
        {
            existing.IsVacant = request.IsVacant;
            existing.TotalCapacity = request.TotalCapacity;
            await availabilityRepo.UpdateAsync(existing);
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
            await availabilityRepo.AddAsync(existing);
        }

        return new AvailabilityResponse(
            existing.Id, existing.RoomId,
            existing.StartDate, existing.EndDate,
            existing.IsVacant, existing.TotalCapacity, existing.ReservedCount);
    }

    public async Task<bool> DeleteAvailabilityAsync(Guid id)
    {
        var avail = await availabilityRepo.GetByIdAsync(id);
        if (avail is null) return false;
        if (avail.ReservedCount > 0)
            throw new InvalidOperationException("Availability window has active reservations and cannot be deleted.");
        await availabilityRepo.DeleteAsync(avail);
        return true;
    }

    public async Task<PagedResult<AdminReservationResponse>> GetAllReservationsAsync(int page, int pageSize)
    {
        var (items, total) = await reservationRepo.GetAllPagedAsync(page, pageSize);
        var dtos = items.Select(r => new AdminReservationResponse(
            r.Id, r.UserId, r.Room.Hotel.Name, r.Room.RoomType,
            r.CheckInDate, r.CheckOutDate, r.GuestCount, r.PricePaid));
        return new PagedResult<AdminReservationResponse>(dtos, page, pageSize, total);
    }

    private static HotelResponse ToResponse(Hotel h) =>
        new(h.Id, h.Name, h.LocationPoint, h.Description, h.AdminEmail, h.ImageUrl, h.Latitude, h.Longitude, h.AdminSub);
}
