using CommentsService.DTOs;
using CommentsService.Models;
using MongoDB.Driver;

namespace CommentsService.Services;

public class CommentService : ICommentService
{
    private readonly IMongoCollection<HotelComment> _collection;

    public CommentService(IMongoClient mongoClient, IConfiguration config)
    {
        var db = mongoClient.GetDatabase(config["MongoDB:Database"] ?? "hotel_comments_db");
        _collection = db.GetCollection<HotelComment>("hotel_comments");

        var indexModel = new CreateIndexModel<HotelComment>(
            Builders<HotelComment>.IndexKeys.Ascending(c => c.HotelId));
        _collection.Indexes.CreateOne(indexModel);
    }

    public async Task<CommentResponse> CreateAsync(CreateCommentRequest request, string userId)
    {
        var comment = new HotelComment
        {
            HotelId = request.HotelId,
            UserId = userId,
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

    public async Task<PagedResult<CommentResponse>> GetByHotelAsync(Guid hotelId, int page, int pageSize)
    {
        var filter = Builders<HotelComment>.Filter.Eq(c => c.HotelId, hotelId);
        var total = (int)await _collection.CountDocumentsAsync(filter);
        var items = await _collection
            .Find(filter)
            .SortByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return new PagedResult<CommentResponse>(items.Select(ToResponse), page, pageSize, total);
    }

    private static CommentResponse ToResponse(HotelComment c) => new(
        c.Id,
        c.HotelId,
        c.UserId,
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
