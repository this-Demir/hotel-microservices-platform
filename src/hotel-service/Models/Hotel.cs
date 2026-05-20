namespace HotelService.Models;

public class Hotel
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LocationPoint { get; set; } = string.Empty; // "lat,lng"
    public string Description { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string? AdminSub { get; set; }
    public string? ImageUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public ICollection<Room> Rooms { get; set; } = new List<Room>();
}
