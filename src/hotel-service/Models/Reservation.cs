namespace HotelService.Models;

public class Reservation
{
    public Guid Id { get; set; }
    public Guid RoomId { get; set; }
    public string UserId { get; set; } = string.Empty; // Cognito sub
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int GuestCount { get; set; }
    public decimal PricePaid { get; set; } // captured at booking time

    public Room Room { get; set; } = null!;
}
