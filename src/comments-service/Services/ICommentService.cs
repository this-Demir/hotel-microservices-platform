using CommentsService.DTOs;

namespace CommentsService.Services;

public interface ICommentService
{
    Task<CommentResponse> CreateAsync(CreateCommentRequest request, string userId, string userEmail);
    Task<CommentPagedResult> GetByHotelAsync(Guid hotelId, int page, int pageSize);
}
