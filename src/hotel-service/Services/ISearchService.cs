using HotelService.DTOs;

namespace HotelService.Services;

public interface ISearchService
{
    Task<PagedResult<SearchResultItem>> SearchAsync(SearchRequest request, bool isAuthenticated);
    Task<RoomDetailResponse?> GetRoomDetailAsync(Guid roomId, bool isAuthenticated);
    Task<HotelDetailResponse?> GetHotelDetailAsync(Guid hotelId, bool isAuthenticated);
}
