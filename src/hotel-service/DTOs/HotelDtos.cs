namespace HotelService.DTOs;

// Admin
public record CreateHotelRequest(string Name, string LocationPoint, string Description);
public record UpdateHotelRequest(string Name, string LocationPoint, string Description);
public record HotelResponse(Guid Id, string Name, string LocationPoint, string Description);

// Rooms
public record CreateRoomRequest(Guid HotelId, string RoomType, decimal BasePrice);
public record RoomResponse(Guid Id, Guid HotelId, string RoomType, decimal BasePrice);

// Availability
public record SetAvailabilityRequest(Guid RoomId, DateOnly StartDate, DateOnly EndDate, bool IsVacant, int TotalCapacity);
public record AvailabilityResponse(Guid Id, Guid RoomId, DateOnly StartDate, DateOnly EndDate, bool IsVacant, int TotalCapacity, int ReservedCount);

// Search
public record SearchRequest(string? Location, DateOnly CheckIn, DateOnly CheckOut, int GuestCount, int Page = 1, int PageSize = 10);
public record SearchResultItem(Guid RoomId, Guid HotelId, string HotelName, string Location, string RoomType, decimal Price);
public record PagedResult<T>(IEnumerable<T> Items, int Page, int PageSize, int TotalCount);

// Booking
public record BookRoomRequest(Guid RoomId, DateOnly CheckIn, DateOnly CheckOut, int GuestCount);
public record BookingResponse(Guid ReservationId, Guid RoomId, DateOnly CheckIn, DateOnly CheckOut, decimal PricePaid);

// Notifications
public record NotificationResponse(Guid Id, string Title, string Body, bool IsRead, DateTime CreatedAt);
