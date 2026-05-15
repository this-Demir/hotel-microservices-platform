using CommentsService.DTOs;

namespace CommentsService.Services;

public interface ICommentService
{
    Task<CommentResponse> CreateAsync(CreateCommentRequest request, string userId);
    Task<PagedResult<CommentResponse>> GetByHotelAsync(Guid hotelId, int page, int pageSize);
}
