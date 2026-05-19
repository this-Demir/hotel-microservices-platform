namespace CommentsService.DTOs;

public record CategoryRatingsDto(
    double Cleanliness,
    double Staff,
    double Facilities,
    double EcoFriendly);

public record CreateCommentRequest(
    Guid HotelId,
    DateTime TravelDate,
    double OverallRating,
    CategoryRatingsDto CategoryRatings,
    string CommentText);

public record CommentResponse(
    string Id,
    Guid HotelId,
    string UserId,
    string UserEmail,
    DateTime TravelDate,
    double OverallRating,
    CategoryRatingsDto CategoryRatings,
    string CommentText,
    string? AdminReply,
    DateTime CreatedAt);

public record PagedResult<T>(IEnumerable<T> Items, int Page, int PageSize, int TotalCount);

public record CommentPagedResult(
    IEnumerable<CommentResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    double AverageRating);
