namespace HotelService.Models;

public class RoomAvailability
{
    public Guid Id { get; set; }
    public Guid RoomId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsVacant { get; set; }
    public int TotalCapacity { get; set; }
    public int ReservedCount { get; set; }

    public Room Room { get; set; } = null!;
}
