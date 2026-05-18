using HotelService.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelService.Data;

public class HotelDbContext(DbContextOptions<HotelDbContext> options) : DbContext(options)
{
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomAvailability> RoomAvailabilities => Set<RoomAvailability>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<HotelImage> HotelImages => Set<HotelImage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Hotel>(e =>
        {
            e.HasKey(h => h.Id);
            e.Property(h => h.Id).HasDefaultValueSql("gen_random_uuid()");
        });

        modelBuilder.Entity<Room>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(r => r.BasePrice).HasColumnType("decimal(10,2)");
            e.HasOne(r => r.Hotel).WithMany(h => h.Rooms).HasForeignKey(r => r.HotelId);
        });

        modelBuilder.Entity<RoomAvailability>(e =>
        {
            e.HasKey(ra => ra.Id);
            e.Property(ra => ra.Id).HasDefaultValueSql("gen_random_uuid()");
            e.HasOne(ra => ra.Room).WithMany(r => r.Availabilities).HasForeignKey(ra => ra.RoomId);
        });

        modelBuilder.Entity<Reservation>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");
            e.Property(r => r.PricePaid).HasColumnType("decimal(10,2)");
            e.HasOne(r => r.Room).WithMany().HasForeignKey(r => r.RoomId);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.Property(n => n.Id).HasDefaultValueSql("gen_random_uuid()");
        });

        modelBuilder.Entity<HotelImage>(e =>
        {
            e.HasKey(i => i.Id);
            e.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");
            e.HasOne(i => i.Hotel).WithMany().HasForeignKey(i => i.HotelId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
