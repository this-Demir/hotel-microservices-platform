using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CommentsService.Models;

public class HotelComment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    public Guid HotelId { get; set; }
    public string UserId { get; set; } = null!;
    public DateTime TravelDate { get; set; }
    public double OverallRating { get; set; }
    public CategoryRatings CategoryRatings { get; set; } = null!;
    public string CommentText { get; set; } = null!;
    public string? AdminReply { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CategoryRatings
{
    public double Cleanliness { get; set; }
    public double Staff { get; set; }
    public double Facilities { get; set; }
    public double EcoFriendly { get; set; }
}
