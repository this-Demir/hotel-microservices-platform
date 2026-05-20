using CommentsService.Models;
using MongoDB.Driver;

namespace CommentsService.Repositories;

public class MongoCommentRepository : ICommentRepository
{
    protected readonly IMongoCollection<HotelComment> _collection;

    public MongoCommentRepository(IMongoClient mongoClient, IConfiguration config)
    {
        var db = mongoClient.GetDatabase(config["MongoDB:Database"] ?? "hotel_comments_db");
        _collection = db.GetCollection<HotelComment>("hotel_comments");
    }

    // For unit testing — bypasses MongoDB client wiring
    internal MongoCommentRepository(IMongoCollection<HotelComment> collection)
    {
        _collection = collection;
    }

    public async Task InsertAsync(HotelComment comment) =>
        await _collection.InsertOneAsync(comment);

    public async Task<long> CountByHotelAsync(Guid hotelId) =>
        await _collection.CountDocumentsAsync(
            Builders<HotelComment>.Filter.Eq(c => c.HotelId, hotelId));

    public async Task<IReadOnlyList<HotelComment>> GetPageByHotelAsync(
        Guid hotelId, int page, int pageSize)
    {
        var filter = Builders<HotelComment>.Filter.Eq(c => c.HotelId, hotelId);
        var options = new FindOptions<HotelComment>
        {
            Sort = Builders<HotelComment>.Sort.Descending(c => c.CreatedAt),
            Skip = (page - 1) * pageSize,
            Limit = pageSize,
        };
        using var cursor = await _collection.FindAsync(filter, options);
        return await cursor.ToListAsync();
    }

    public async Task<double> GetAverageRatingAsync(Guid hotelId)
    {
        var filter = Builders<HotelComment>.Filter.Eq(c => c.HotelId, hotelId);
        return await ComputeAverageRatingAsync(filter);
    }

    // Kept virtual so tests can override without hitting Mongo aggregation
    protected virtual async Task<double> ComputeAverageRatingAsync(
        FilterDefinition<HotelComment> filter)
    {
        var result = await _collection
            .Aggregate()
            .Match(filter)
            .Group(c => 1, g => new { Avg = g.Average(c => c.OverallRating) })
            .FirstOrDefaultAsync();
        return result?.Avg ?? 0;
    }
}
