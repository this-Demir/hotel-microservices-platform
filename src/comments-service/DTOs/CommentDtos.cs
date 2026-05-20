using System.ComponentModel.DataAnnotations;

namespace CommentsService.DTOs;

public record CategoryRatingsDto(
    [property: Range(1.0, 5.0)] double Cleanliness,
    [property: Range(1.0, 5.0)] double Staff,
    [property: Range(1.0, 5.0)] double Facilities,
    [property: Range(1.0, 5.0)] double EcoFriendly);

public record CreateCommentRequest(
    Guid HotelId,
    DateTime TravelDate,
    [property: Range(1.0, 5.0)] double OverallRating,
    [property: Required] CategoryRatingsDto CategoryRatings,
    [property: Required, MinLength(3), MaxLength(2000)] string CommentText
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (HotelId == Guid.Empty)
            yield return new ValidationResult("HotelId must not be empty.", [nameof(HotelId)]);
    }
}

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
