using CommentsService.DTOs;
using CommentsService.Models;
using CommentsService.Services;
using MongoDB.Driver;
using Moq;

namespace CommentsService.Tests;

/// <summary>
/// Exposes the internal constructor so tests can inject a mock collection.
/// </summary>
file sealed class TestableCommentService : CommentService
{
    public TestableCommentService(IMongoCollection<HotelComment> collection) : base(collection) { }
    protected override Task<double> ComputeAverageRatingAsync(FilterDefinition<HotelComment> filter) => Task.FromResult(0.0);
}

public class CommentServiceTests
{
    private readonly Mock<IMongoCollection<HotelComment>> _collection = new();

    private CommentService Build() => new TestableCommentService(_collection.Object);

    private static Mock<IAsyncCursor<HotelComment>> BuildCursor(List<HotelComment> items)
    {
        var cursor = new Mock<IAsyncCursor<HotelComment>>();
        cursor.SetupSequence(x => x.MoveNextAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(true)
            .ReturnsAsync(false);
        cursor.Setup(x => x.Current).Returns(items);
        return cursor;
    }

    // ── CreateAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_CallsInsertOne_AndReturnsCorrectResponse()
    {
        _collection.Setup(c => c.InsertOneAsync(
                It.IsAny<HotelComment>(),
                It.IsAny<InsertOneOptions?>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var hotelId = Guid.NewGuid();
        var request = new CreateCommentRequest(
            hotelId, DateTime.UtcNow, 4.5,
            new CategoryRatingsDto(5.0, 4.0, 3.5, 4.5), "Great stay!");

        var result = await Build().CreateAsync(request, "user-001", "user001@example.com");

        Assert.Equal(hotelId, result.HotelId);
        Assert.Equal("user-001", result.UserId);
        Assert.Equal(4.5, result.OverallRating);
        Assert.Equal("Great stay!", result.CommentText);
        _collection.Verify(c => c.InsertOneAsync(
            It.Is<HotelComment>(h => h.HotelId == hotelId && h.UserId == "user-001"),
            It.IsAny<InsertOneOptions?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_MapsAllCategoryRatings()
    {
        _collection.Setup(c => c.InsertOneAsync(
                It.IsAny<HotelComment>(),
                It.IsAny<InsertOneOptions?>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var ratings = new CategoryRatingsDto(4.0, 5.0, 3.0, 2.5);
        var request = new CreateCommentRequest(Guid.NewGuid(), DateTime.UtcNow, 4.0, ratings, "OK");

        var result = await Build().CreateAsync(request, "user-002", "user002@example.com");

        Assert.Equal(4.0, result.CategoryRatings.Cleanliness);
        Assert.Equal(5.0, result.CategoryRatings.Staff);
        Assert.Equal(3.0, result.CategoryRatings.Facilities);
        Assert.Equal(2.5, result.CategoryRatings.EcoFriendly);
    }

    // ── GetByHotelAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByHotelAsync_ReturnsPagedResult_WithCorrectCount()
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

        _collection.Setup(c => c.CountDocumentsAsync(
                It.IsAny<FilterDefinition<HotelComment>>(),
                It.IsAny<CountOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(2L);

        _collection.Setup(c => c.FindAsync(
                It.IsAny<FilterDefinition<HotelComment>>(),
                It.IsAny<FindOptions<HotelComment, HotelComment>?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildCursor(comments).Object);

        var result = await Build().GetByHotelAsync(hotelId, page: 1, pageSize: 10);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count());
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
    }

    [Fact]
    public async Task GetByHotelAsync_EmptyCollection_ReturnsZeroItems()
    {
        _collection.Setup(c => c.CountDocumentsAsync(
                It.IsAny<FilterDefinition<HotelComment>>(),
                It.IsAny<CountOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(0L);

        _collection.Setup(c => c.FindAsync(
                It.IsAny<FilterDefinition<HotelComment>>(),
                It.IsAny<FindOptions<HotelComment, HotelComment>?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildCursor(new List<HotelComment>()).Object);

        var result = await Build().GetByHotelAsync(Guid.NewGuid(), page: 1, pageSize: 10);

        Assert.Equal(0, result.TotalCount);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task GetByHotelAsync_Pagination_PassesCorrectSkipAndLimit()
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

        await Build().GetByHotelAsync(Guid.NewGuid(), page: 3, pageSize: 5);

        Assert.NotNull(capturedOptions);
        Assert.Equal(10, capturedOptions.Skip);  // (page-1) * pageSize = 2 * 5
        Assert.Equal(5, capturedOptions.Limit);
    }
}
