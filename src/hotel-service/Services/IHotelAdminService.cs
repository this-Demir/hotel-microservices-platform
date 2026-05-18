using HotelService.DTOs;
using Microsoft.AspNetCore.Http;

namespace HotelService.Services;

public interface IHotelAdminService
{
    Task<HotelResponse> CreateHotelAsync(CreateHotelRequest request);
    Task<HotelResponse?> UpdateHotelAsync(Guid id, UpdateHotelRequest request);
    Task<bool> DeleteHotelAsync(Guid id);
    Task<HotelResponse?> GetHotelAsync(Guid id);
    Task<PagedResult<HotelResponse>> GetHotelsAsync(int page, int pageSize);
    Task<HotelResponse?> UploadHotelImageAsync(Guid id, IFormFile file);

    Task<RoomResponse> CreateRoomAsync(CreateRoomRequest request);
    Task<bool> DeleteRoomAsync(Guid id);
    Task<PagedResult<RoomResponse>> GetRoomsAsync(Guid hotelId, int page, int pageSize);
    Task<IEnumerable<AvailabilityResponse>> GetAvailabilityAsync(Guid roomId);
    Task<AvailabilityResponse> SetAvailabilityAsync(SetAvailabilityRequest request);
}
