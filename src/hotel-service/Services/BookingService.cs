using System.Text;
using System.Text.Json;
using HotelService.Data;
using HotelService.DTOs;
using HotelService.Models;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;

namespace HotelService.Services;

public class BookingService(HotelDbContext db, IConnection rabbitConnection) : IBookingService
{
    private const string QueueName = "booking-events";

    public async Task<BookingResponse> BookRoomAsync(
        BookRoomRequest request, string userId, string userEmail, bool isAuthenticated)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();

        // SELECT FOR UPDATE — locks the matching RoomAvailability row for the duration of the tx
        var availability = await GetAvailabilityForUpdateAsync(request.RoomId, request.CheckIn, request.CheckOut)
            ?? throw new InvalidOperationException("Room not available for the requested dates.");

        if (availability.ReservedCount >= availability.TotalCapacity)
            throw new InvalidOperationException("Room is fully booked.");

        var room = await db.Rooms
            .Include(r => r.Hotel)
            .FirstAsync(r => r.Id == availability.RoomId);

        var nights = request.CheckOut.DayNumber - request.CheckIn.DayNumber;
        if (nights <= 0) throw new ArgumentException("Check-out must be after check-in.");

        var pricePerNight = isAuthenticated
            ? Math.Round(room.BasePrice * 0.85m, 2)
            : room.BasePrice;
        var pricePaid = pricePerNight * nights;

        availability.ReservedCount++;
        if (availability.ReservedCount >= availability.TotalCapacity)
            availability.IsVacant = false;

        var reservation = new Reservation
        {
            RoomId = request.RoomId,
            UserId = userId,
            CheckInDate = request.CheckIn,
            CheckOutDate = request.CheckOut,
            GuestCount = request.GuestCount,
            PricePaid = pricePaid,
        };
        db.Reservations.Add(reservation);

        await db.SaveChangesAsync();
        await transaction.CommitAsync();

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

    public async Task<PagedResult<ReservationResponse>> GetUserReservationsAsync(string userId, int page, int pageSize)
    {
        var query = db.Reservations
            .Include(r => r.Room).ThenInclude(r => r.Hotel)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CheckInDate);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ReservationResponse(
                r.Id, r.RoomId, r.Room.Hotel.Name, r.Room.RoomType,
                r.CheckInDate, r.CheckOutDate, r.GuestCount, r.PricePaid))
            .ToListAsync();

        return new PagedResult<ReservationResponse>(items, page, pageSize, total);
    }

    protected virtual async Task<RoomAvailability?> GetAvailabilityForUpdateAsync(
        Guid roomId, DateOnly checkIn, DateOnly checkOut)
    {
        return (await db.RoomAvailabilities
            .FromSqlInterpolated($"""
                SELECT * FROM "RoomAvailabilities"
                WHERE "RoomId" = {roomId}
                  AND "StartDate" <= {checkIn}
                  AND "EndDate" >= {checkOut}
                  AND "IsVacant" = true
                FOR UPDATE
                """)
            .ToListAsync())
            .FirstOrDefault();
    }

    private async Task PublishBookingEventAsync(object evt)
    {
        await using var channel = await rabbitConnection.CreateChannelAsync();
        await channel.QueueDeclareAsync(
            queue: QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt));
        await channel.BasicPublishAsync(
            exchange: string.Empty,
            routingKey: QueueName,
            body: body.AsMemory());
    }
}
