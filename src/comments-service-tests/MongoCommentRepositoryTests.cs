using CommentsService.Models;
using CommentsService.Repositories;
using MongoDB.Driver;
using Moq;

namespace CommentsService.Tests;

/// <summary>
/// Overrides the Mongo aggregation pipeline so tests don't require a real Mongo instance.
/// </summary>
file sealed class TestableMongoCommentRepository : MongoCommentRepository
{
    public TestableMongoCommentRepository(IMongoCollection<HotelComment> collection) : base(collection) { }
    protected override Task<double> ComputeAverageRatingAsync(FilterDefinition<HotelComment> filter)
        => Task.FromResult(0.0);
}

public class MongoCommentRepositoryTests
{
    private readonly Mock<IMongoCollection<HotelComment>> _collection = new();

    private MongoCommentRepository Build() => new TestableMongoCommentRepository(_collection.Object);

    private static Mock<IAsyncCursor<HotelComment>> BuildCursor(List<HotelComment> items)
    {
        var cursor = new Mock<IAsyncCursor<HotelComment>>();
        cursor.SetupSequence(x => x.MoveNextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(true)
            .ReturnsAsync(false);
        cursor.Setup(x => x.Current).Returns(items);
        return cursor;
    }

    // ── InsertAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task InsertAsync_CallsInsertOneOnCollection()
    {
        _collection.Setup(c => c.InsertOneAsync(
                It.IsAny<HotelComment>(),
                It.IsAny<InsertOneOptions?>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var comment = new HotelComment
        {
            HotelId = Guid.NewGuid(),
            UserId = "user-001",
            CategoryRatings = new CategoryRatings(),
        };

        await Build().InsertAsync(comment);

        _collection.Verify(c => c.InsertOneAsync(
            It.Is<HotelComment>(h => h.UserId == "user-001"),
            It.IsAny<InsertOneOptions?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── GetPageByHotelAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetPageByHotelAsync_ReturnsCorrectItems()
    {
        var hotelId = Guid.NewGuid();
        var comments = new List<HotelComment>
        {
            new() { Id = "abc1", HotelId = hotelId, UserId = "u1", OverallRating = 4.0,
                CategoryRatings = new CategoryRatings { Cleanliness = 4, Staff = 4, Facilities = 4, EcoFriendly = 4 },
                CommentText = "Nice", CreatedAt = DateTime.UtcNow },
            new() { Id = "abc2", HotelId = hotelId, UserId = "u2", OverallRating = 3.5,
                CategoryRatings = new CategoryRatings { Cleanliness = 3, Staff = 4, Facilities = 3, EcoFriendly = 4 },
                CommentText = "Decent", CreatedAt = DateTime.UtcNow.AddDays(-1) },
        };

        _collection.Setup(c => c.FindAsync(
                It.IsAny<FilterDefinition<HotelComment>>(),
                It.IsAny<FindOptions<HotelComment, HotelComment>?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildCursor(comments).Object);

        var result = await Build().GetPageByHotelAsync(hotelId, page: 1, pageSize: 10);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetPageByHotelAsync_PassesCorrectSkipAndLimit()
    {
        _collection.Setup(c => c.CountDocumentsAsync(
                It.IsAny<FilterDefinition<HotelComment>>(),
                It.IsAny<CountOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(25L);

        FindOptions<HotelComment, HotelComment>? capturedOptions = null;
        _collection.Setup(c => c.FindAsync(
                It.IsAny<FilterDefinition<HotelComment>>(),
                It.IsAny<FindOptions<HotelComment, HotelComment>?>(),
                It.IsAny<CancellationToken>()))
            .Callback<FilterDefinition<HotelComment>, FindOptions<HotelComment, HotelComment>?, CancellationToken>(
                (_, opts, _) => capturedOptions = opts)
            .ReturnsAsync(BuildCursor(new List<HotelComment>()).Object);

        await Build().GetPageByHotelAsync(Guid.NewGuid(), page: 3, pageSize: 5);

        Assert.NotNull(capturedOptions);
        Assert.Equal(10, capturedOptions.Skip);  // (page-1) * pageSize = 2 * 5
        Assert.Equal(5, capturedOptions.Limit);
    }
}
