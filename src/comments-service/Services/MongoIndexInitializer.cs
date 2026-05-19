using CommentsService.Models;
using MongoDB.Driver;

namespace CommentsService.Services;

public class MongoIndexInitializer(
    IMongoClient mongoClient,
    IConfiguration config,
    ILogger<MongoIndexInitializer> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            var db = mongoClient.GetDatabase(config["MongoDB:Database"] ?? "hotel_comments_db");
            var collection = db.GetCollection<HotelComment>("hotel_comments");
            var indexModel = new CreateIndexModel<HotelComment>(
                Builders<HotelComment>.IndexKeys.Ascending(c => c.HotelId));
            await collection.Indexes.CreateOneAsync(indexModel, cancellationToken: cancellationToken);
            logger.LogInformation("MongoDB: HotelId index on hotel_comments ensured.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "MongoDB: failed to create HotelId index at startup. Continuing without it.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
