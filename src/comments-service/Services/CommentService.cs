using CommentsService.DTOs;
using CommentsService.Models;
using CommentsService.Repositories;

namespace CommentsService.Services;

public class CommentService(ICommentRepository repo) : ICommentService
{
    public async Task<CommentResponse> CreateAsync(CreateCommentRequest request, string userId, string userEmail)
    {
        var comment = new HotelComment
        {
            HotelId = request.HotelId,
            UserId = userId,
            UserEmail = userEmail,
            TravelDate = request.TravelDate,
            OverallRating = request.OverallRating,
            CategoryRatings = new CategoryRatings
            {
                Cleanliness = request.CategoryRatings.Cleanliness,
                Staff = request.CategoryRatings.Staff,
                Facilities = request.CategoryRatings.Facilities,
                EcoFriendly = request.CategoryRatings.EcoFriendly,
            },
            CommentText = request.CommentText,
            CreatedAt = DateTime.UtcNow,
        };

        await repo.InsertAsync(comment);
        return ToResponse(comment);
    }

    public async Task<CommentPagedResult> GetByHotelAsync(Guid hotelId, int page, int pageSize)
    {
        var countTask = repo.CountByHotelAsync(hotelId);
        var avgTask = repo.GetAverageRatingAsync(hotelId);
        await Task.WhenAll(countTask, avgTask);

        var total = (int)countTask.Result;
        var averageRating = avgTask.Result;

        var items = await repo.GetPageByHotelAsync(hotelId, page, pageSize);
        return new CommentPagedResult(items.Select(ToResponse), page, pageSize, total, Math.Round(averageRating, 2));
    }

    private static CommentResponse ToResponse(HotelComment c) => new(
        c.Id,
        c.HotelId,
        c.UserId,
        c.UserEmail,
        c.TravelDate,
        c.OverallRating,
        new CategoryRatingsDto(
            c.CategoryRatings.Cleanliness,
            c.CategoryRatings.Staff,
            c.CategoryRatings.Facilities,
            c.CategoryRatings.EcoFriendly),
        c.CommentText,
        c.AdminReply,
        c.CreatedAt);
}
