using HotelService.DTOs;

namespace HotelService.Services;

public interface ISearchService
{
    Task<PagedResult<SearchResultItem>> SearchAsync(SearchRequest request, bool isAuthenticated);
}
