using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HotelService.Data;

/// <summary>
/// Used exclusively by `dotnet ef` CLI at design time (migrations).
/// The connection string here is a local placeholder; actual migrations are applied
/// against Supabase via the connection string in appsettings.Development.json.
/// </summary>
public class HotelDbContextFactory : IDesignTimeDbContextFactory<HotelDbContext>
{
    public HotelDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<HotelDbContext>()
            .UseNpgsql("Host=localhost;Database=hoteldb_design;Username=postgres;Password=postgres")
            .Options;
        return new HotelDbContext(options);
    }
}
