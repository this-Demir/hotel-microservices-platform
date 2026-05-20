using CommentsService.Models;

namespace CommentsService.Repositories;

public interface ICommentRepository
{
    Task InsertAsync(HotelComment comment);
    Task<long> CountByHotelAsync(Guid hotelId);
    Task<IReadOnlyList<HotelComment>> GetPageByHotelAsync(Guid hotelId, int page, int pageSize);
    Task<double> GetAverageRatingAsync(Guid hotelId);
}
