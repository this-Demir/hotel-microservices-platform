using CommentsService.DTOs;
using CommentsService.Models;
using CommentsService.Repositories;
using CommentsService.Services;
using Moq;

namespace CommentsService.Tests;

public class CommentServiceTests
{
    private static CommentService Build(ICommentRepository repo) => new(repo);

    // ── CreateAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_CallsInsert_AndReturnsCorrectResponse()
    {
        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.InsertAsync(It.IsAny<HotelComment>())).Returns(Task.CompletedTask);

        var hotelId = Guid.NewGuid();
        var request = new CreateCommentRequest(
            hotelId, DateTime.UtcNow, 4.5,
            new CategoryRatingsDto(5.0, 4.0, 3.5, 4.5), "Great stay!");

        var result = await Build(repo.Object).CreateAsync(request, "user-001", "user001@example.com");

        Assert.Equal(hotelId, result.HotelId);
        Assert.Equal("user-001", result.UserId);
        Assert.Equal(4.5, result.OverallRating);
        Assert.Equal("Great stay!", result.CommentText);
        repo.Verify(r => r.InsertAsync(
            It.Is<HotelComment>(h => h.HotelId == hotelId && h.UserId == "user-001")),
            Times.Once);
    }

    [Fact]
    public async Task CreateAsync_MapsAllCategoryRatings()
    {
        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.InsertAsync(It.IsAny<HotelComment>())).Returns(Task.CompletedTask);

        var ratings = new CategoryRatingsDto(4.0, 5.0, 3.0, 2.5);
        var request = new CreateCommentRequest(Guid.NewGuid(), DateTime.UtcNow, 4.0, ratings, "OK");

        var result = await Build(repo.Object).CreateAsync(request, "user-002", "user002@example.com");

        Assert.Equal(4.0, result.CategoryRatings.Cleanliness);
        Assert.Equal(5.0, result.CategoryRatings.Staff);
        Assert.Equal(3.0, result.CategoryRatings.Facilities);
        Assert.Equal(2.5, result.CategoryRatings.EcoFriendly);
    }

    // ── GetByHotelAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByHotelAsync_AssemblesCorrectPagedResult()
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

        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.CountByHotelAsync(hotelId)).ReturnsAsync(2L);
        repo.Setup(r => r.GetAverageRatingAsync(hotelId)).ReturnsAsync(3.75);
        repo.Setup(r => r.GetPageByHotelAsync(hotelId, 1, 10))
            .ReturnsAsync(comments.AsReadOnly());

        var result = await Build(repo.Object).GetByHotelAsync(hotelId, page: 1, pageSize: 10);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count());
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(3.75, result.AverageRating);
    }

    [Fact]
    public async Task GetByHotelAsync_EmptyCollection_ReturnsZeroItems()
    {
        var hotelId = Guid.NewGuid();
        var repo = new Mock<ICommentRepository>();
        repo.Setup(r => r.CountByHotelAsync(hotelId)).ReturnsAsync(0L);
        repo.Setup(r => r.GetAverageRatingAsync(hotelId)).ReturnsAsync(0.0);
        repo.Setup(r => r.GetPageByHotelAsync(hotelId, 1, 10))
            .ReturnsAsync(new List<HotelComment>().AsReadOnly());

        var result = await Build(repo.Object).GetByHotelAsync(hotelId, page: 1, pageSize: 10);

        Assert.Equal(0, result.TotalCount);
        Assert.Empty(result.Items);
    }
}
