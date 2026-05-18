namespace HotelService.Models;

public class HotelImage
{
    public Guid Id { get; set; }
    public Guid HotelId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Hotel Hotel { get; set; } = null!;
}
