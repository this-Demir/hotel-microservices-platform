using System.Text;
using System.Text.Json;
using HotelService.DTOs;
using HotelService.Repositories;
using RabbitMQ.Client;

namespace HotelService.Services;

public class BookingService(
    IRoomRepository roomRepo,
    IReservationRepository reservationRepo,
    IConnection rabbitConnection) : IBookingService
{
    private const string QueueName = "booking-events";

    public async Task<BookingResponse> BookRoomAsync(
        BookRoomRequest request, string userId, string userEmail, bool isAuthenticated)
    {
        var room = await roomRepo.GetByIdWithHotelAsync(request.RoomId)
            ?? throw new InvalidOperationException("Room not found.");

        var nights = request.CheckOut.DayNumber - request.CheckIn.DayNumber;
        if (nights <= 0)
            throw new ArgumentException("Check-out must be after check-in.");

        var pricePerNight = isAuthenticated
            ? Math.Round(room.BasePrice * 0.85m, 2)
            : room.BasePrice;
        var pricePaid = pricePerNight * nights;

        var reservation = await reservationRepo.CreateBookingAsync(
            request.RoomId, userId, request.CheckIn, request.CheckOut, request.GuestCount, pricePaid);

        await PublishBookingEventAsync(new
        {
            ReservationId = reservation.Id,
            UserId = userId,
            UserEmail = userEmail,
            HotelName = room.Hotel.Name,
            RoomType = room.RoomType,
            CheckIn = request.CheckIn,
            CheckOut = request.CheckOut,
            PricePaid = pricePaid,
        });

        return new BookingResponse(reservation.Id, reservation.RoomId, request.CheckIn, request.CheckOut, pricePaid);
    }

    public async Task<PagedResult<ReservationResponse>> GetUserReservationsAsync(
        string userId, int page, int pageSize)
    {
        var (items, total) = await reservationRepo.GetPagedByUserAsync(userId, page, pageSize);
        var dtos = items.Select(r => new ReservationResponse(
            r.Id, r.RoomId, r.Room.Hotel.Name, r.Room.RoomType,
            r.CheckInDate, r.CheckOutDate, r.GuestCount, r.PricePaid));
        return new PagedResult<ReservationResponse>(dtos, page, pageSize, total);
    }

    private async Task PublishBookingEventAsync(object evt)
    {
        await using var channel = await rabbitConnection.CreateChannelAsync();
        await channel.QueueDeclareAsync(
            queue: QueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt));
        await channel.BasicPublishAsync(
            exchange: string.Empty, routingKey: QueueName, body: body.AsMemory());
    }
}
