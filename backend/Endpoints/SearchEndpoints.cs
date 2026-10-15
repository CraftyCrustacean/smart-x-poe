using backend.Models.Search;
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

        // POST /api/search/clicks
        group.MapPost(
            "/clicks",
            (SearchClickRequest request, DeviceRegistry registry, SearchClickLog log) =>
            {
                if (string.IsNullOrEmpty(request.DeviceId))
                    return Results.BadRequest(new { message = "A device id is required." });

                if (!registry.TryGet(request.DeviceId, out var device))
                    return Results.NotFound(
                        new { message = $"Device {request.DeviceId} is not registered." }
                    );

                log.Add(
                    new SearchClick(
                        DateTime.UtcNow,
                        device.DeviceId,
                        device.Zone,
                        device.Subzone,
                        request.Filters ?? new Dictionary<string, string[]>()
                    )
                );
                return Results.NoContent();
            }
        );

        // GET /api/search/clicks
        group.MapGet("/clicks", (SearchClickLog log) => Results.Ok(log.Snapshot()));
    }
}
