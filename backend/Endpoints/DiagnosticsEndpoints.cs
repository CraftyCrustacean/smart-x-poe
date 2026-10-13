using backend.Services;

namespace backend.Endpoints;

public static class DiagnosticsEndpoints
{
    public static void MapDiagnosticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/diagnostics");

        // GET /api/diagnostics/queues
        group.MapGet("/queues", (TelemetryQueue queue) => Results.Ok(queue.GetStats()));
    }
}
