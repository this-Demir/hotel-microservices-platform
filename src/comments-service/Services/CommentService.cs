using CommentsService.DTOs;
using CommentsService.Models;
using MongoDB.Driver;

namespace CommentsService.Services;

public class CommentService : ICommentService
{
    protected readonly IMongoCollection<HotelComment> _collection;

    public CommentService(IMongoClient mongoClient, IConfiguration config)
    {
        var db = mongoClient.GetDatabase(config["MongoDB:Database"] ?? "hotel_comments_db");
        _collection = db.GetCollection<HotelComment>("hotel_comments");
    }

    // For unit testing — bypasses MongoDB client wiring
    internal CommentService(IMongoCollection<HotelComment> collection)
    {
        _collection = collection;
    }

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

        await _collection.InsertOneAsync(comment);
        return ToResponse(comment);
    }

    public async Task<CommentPagedResult> GetByHotelAsync(Guid hotelId, int page, int pageSize)
    {
        var filter = Builders<HotelComment>.Filter.Eq(c => c.HotelId, hotelId);

        var totalTask = _collection.CountDocumentsAsync(filter);
        var avgTask = ComputeAverageRatingAsync(filter);

        await Task.WhenAll(totalTask, avgTask);

        var total = (int)totalTask.Result;
        double averageRating = avgTask.Result;

        var options = new FindOptions<HotelComment>
        {
            Sort = Builders<HotelComment>.Sort.Descending(c => c.CreatedAt),
            Skip = (page - 1) * pageSize,
            Limit = pageSize,
        };
        using var cursor = await _collection.FindAsync(filter, options);
        var items = await cursor.ToListAsync();
        return new CommentPagedResult(items.Select(ToResponse), page, pageSize, total, Math.Round(averageRating, 2));
    }

    protected virtual async Task<double> ComputeAverageRatingAsync(FilterDefinition<HotelComment> filter)
    {
        var result = await _collection
            .Aggregate()
            .Match(filter)
            .Group(c => 1, g => new { Avg = g.Average(c => c.OverallRating) })
            .FirstOrDefaultAsync();
        return result?.Avg ?? 0;
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
