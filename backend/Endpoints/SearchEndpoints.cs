using backend.Models.Search;
using backend.Services.Insights;
using backend.Services.Search;
using backend.Services.State;

namespace backend.Endpoints;

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/search");

        // GET /api/search/devices
        group.MapGet(
            "/devices",
            ([AsParameters] DeviceSearchQuery query, DeviceSearchService search) =>
                Results.Ok(search.Search(query))
        );

        // GET /api/search/suggest?q=a1b2&limit=8
        group.MapGet(
            "/suggest",
            (string? q, int? limit, DeviceSearchService search) =>
                Results.Ok(search.Suggest(q, limit ?? 8))
        );

        // POST /api/search/clicks
        group.MapPost(
            "/clicks",
            (
                SearchClickRequest request,
                DeviceRegistry registry,
                SearchClickLog log,
                InsightEngine insights
            ) =>
            {
                if (string.IsNullOrEmpty(request.DeviceId))
                    return Results.BadRequest(new { message = "A device id is required." });

                if (!registry.TryGet(request.DeviceId, out var device))
                    return Results.NotFound(
                        new { message = $"Device {request.DeviceId} is not registered." }
                    );

                var click = new SearchClick(
                    DateTime.UtcNow,
                    device.DeviceId,
                    device.Zone,
                    device.Subzone,
                    request.Filters ?? new Dictionary<string, string[]>()
                );
                log.Add(click);
                insights.LearnFromClick(click);
                return Results.NoContent();
            }
        );

        // GET /api/search/clicks
        group.MapGet("/clicks", (SearchClickLog log) => Results.Ok(log.Snapshot()));
    }
}
