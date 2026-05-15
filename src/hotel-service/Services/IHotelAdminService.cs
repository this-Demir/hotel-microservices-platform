using HotelService.DTOs;

namespace HotelService.Services;

public interface IHotelAdminService
{
    Task<HotelResponse> CreateHotelAsync(CreateHotelRequest request);
    Task<HotelResponse?> UpdateHotelAsync(Guid id, UpdateHotelRequest request);
    Task<bool> DeleteHotelAsync(Guid id);
    Task<HotelResponse?> GetHotelAsync(Guid id);
    Task<PagedResult<HotelResponse>> GetHotelsAsync(int page, int pageSize);

    Task<RoomResponse> CreateRoomAsync(CreateRoomRequest request);
    Task<AvailabilityResponse> SetAvailabilityAsync(SetAvailabilityRequest request);
}
