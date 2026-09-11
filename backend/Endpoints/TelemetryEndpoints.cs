using backend.Services;

namespace backend.Endpoints;

public static class TelemetryEndpoints
{
    public static void MapTelemetryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/telemetry");

        // GET /api/telemetry/recent
        group.MapGet("/recent", (TelemetryBatcher batcher) =>
        {
            var recentBatches = batcher.GetRecentBatches();
            return Results.Ok(recentBatches);
        });
    }
}

