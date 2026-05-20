using System.ComponentModel.DataAnnotations;

namespace HotelService.DTOs;

// Admin
public record CreateHotelRequest(
    [property: Required, MinLength(2), MaxLength(200)] string Name,
    [property: Required, MinLength(2), MaxLength(200)] string LocationPoint,
    [property: Required, MaxLength(2000)] string Description,
    [property: Required, EmailAddress] string AdminEmail,
    [property: Range(-90.0, 90.0)] double? Latitude = null,
    [property: Range(-180.0, 180.0)] double? Longitude = null,
    string? AdminSub = null);

public record UpdateHotelRequest(
    [property: Required, MinLength(2), MaxLength(200)] string Name,
    [property: Required, MinLength(2), MaxLength(200)] string LocationPoint,
    [property: Required, MaxLength(2000)] string Description,
    [property: Required, EmailAddress] string AdminEmail,
    [property: Range(-90.0, 90.0)] double? Latitude = null,
    [property: Range(-180.0, 180.0)] double? Longitude = null,
    string? AdminSub = null);

public record HotelResponse(Guid Id, string Name, string LocationPoint, string Description, string AdminEmail, string? ImageUrl, double? Latitude, double? Longitude, string? AdminSub = null);

// Hotel images
public record UploadImageRequest(
    [property: Required, MaxLength(120)] string Title,
    [property: Required] string FileBase64,
    [property: Required] string ContentType);

public record HotelImageResponse(Guid Id, Guid HotelId, string Title, string ImageUrl, DateTime CreatedAt);

// Rooms
public record CreateRoomRequest(
    Guid HotelId,
    [property: Required, MinLength(2), MaxLength(60)] string RoomType,
    [property: Range(typeof(decimal), "0.01", "100000")] decimal BasePrice
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (HotelId == Guid.Empty)
            yield return new ValidationResult("HotelId must not be empty.", [nameof(HotelId)]);
    }
}

public record UpdateRoomRequest(
    [property: Required, MinLength(2), MaxLength(60)] string RoomType,
    [property: Range(typeof(decimal), "0.01", "100000")] decimal BasePrice);

public record RoomResponse(Guid Id, Guid HotelId, string RoomType, decimal BasePrice);

// Availability
public record SetAvailabilityRequest(
    Guid RoomId,
    DateOnly StartDate,
    DateOnly EndDate,
    bool IsVacant,
    [property: Range(1, 1000)] int TotalCapacity
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (RoomId == Guid.Empty)
            yield return new ValidationResult("RoomId must not be empty.", [nameof(RoomId)]);
        if (EndDate <= StartDate)
            yield return new ValidationResult("EndDate must be after StartDate.", [nameof(EndDate)]);
    }
}

public record AvailabilityResponse(Guid Id, Guid RoomId, DateOnly StartDate, DateOnly EndDate, bool IsVacant, int TotalCapacity, int ReservedCount);

// Hotel detail (public)
public record HotelDetailResponse(Guid Id, string Name, string Location, string Description, string? ImageUrl, IEnumerable<SearchResultItem> Rooms);

// Search
public record SearchRequest(
    string? Location,
    DateOnly? CheckIn,
    DateOnly? CheckOut,
    [Range(1, 50)] int GuestCount = 1,
    [Range(1, int.MaxValue)] int Page = 1,
    [Range(1, 100)] int PageSize = 10
) : IValidatableObject
{
    public DateOnly ResolvedCheckIn  => CheckIn  ?? DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly ResolvedCheckOut => CheckOut ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (CheckIn.HasValue && CheckOut.HasValue && CheckOut.Value <= CheckIn.Value)
            yield return new ValidationResult("CheckOut must be after CheckIn.", [nameof(CheckOut)]);
    }
}

public record SearchResultItem(Guid RoomId, Guid HotelId, string HotelName, string Location, string? HotelImageUrl, string RoomType, decimal Price, double? Latitude = null, double? Longitude = null);
public record RoomDetailResponse(Guid RoomId, Guid HotelId, string HotelName, string Location, string? HotelImageUrl, string RoomType, decimal Price, double? Latitude = null, double? Longitude = null);
public record PagedResult<T>(IEnumerable<T> Items, int Page, int PageSize, int TotalCount);

// Booking
public record BookRoomRequest(
    Guid RoomId,
    DateOnly CheckIn,
    DateOnly CheckOut,
    [property: Range(1, 50)] int GuestCount
) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (RoomId == Guid.Empty)
            yield return new ValidationResult("RoomId must not be empty.", [nameof(RoomId)]);
        if (CheckOut <= CheckIn)
            yield return new ValidationResult("CheckOut must be after CheckIn.", [nameof(CheckOut)]);
    }
}

public record BookingResponse(Guid ReservationId, Guid RoomId, DateOnly CheckIn, DateOnly CheckOut, decimal PricePaid);
public record ReservationResponse(Guid Id, Guid RoomId, string HotelName, string RoomType, DateOnly CheckIn, DateOnly CheckOut, int GuestCount, decimal PricePaid);

// Admin reservations
public record AdminReservationResponse(Guid Id, string UserId, string HotelName, string RoomType, DateOnly CheckIn, DateOnly CheckOut, int GuestCount, decimal PricePaid);

// Notifications
public record NotificationResponse(Guid Id, string Title, string Body, bool IsRead, DateTime CreatedAt);
