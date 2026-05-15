namespace NotificationService.Messaging;

public record BookingEvent(
    Guid ReservationId,
    string UserId,
    string UserEmail,
    string HotelName,
    string RoomType,
    DateOnly CheckIn,
    DateOnly CheckOut,
    decimal PricePaid);
