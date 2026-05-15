namespace HotelService.Models;

public class Room
{
    public Guid Id { get; set; }
    public Guid HotelId { get; set; }
    public string RoomType { get; set; } = string.Empty; // Standard, Family, etc.
    public decimal BasePrice { get; set; }

    public Hotel Hotel { get; set; } = null!;
    public ICollection<RoomAvailability> Availabilities { get; set; } = new List<RoomAvailability>();
}
