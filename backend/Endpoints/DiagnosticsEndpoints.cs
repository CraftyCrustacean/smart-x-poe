using backend.Services.State;
using backend.Services.Telemetry;


namespace backend.Endpoints;

public static class DiagnosticsEndpoints
{
    public static void MapDiagnosticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/diagnostics");

        // GET /api/diagnostics/queues
        group.MapGet("/queues", (TelemetryQueue queue) => Results.Ok(queue.GetStats()));

        // GET /api/diagnostics/sets
        group.MapGet(
            "/sets",
            (DeviceRegistry registry, DisconnectedDevices disconnected, ActiveAlerts alerts) =>
            {
                var devices = registry.Snapshot();

                return Results.Ok(
                    new
                    {
                        Registered = devices.Count,
                        NeverReported = devices.Count(d => d.LastSeenUtc is null),
                        Disconnected = disconnected.Count,
                        DisconnectDuplicatesSuppressed = disconnected.DuplicatesSuppressed,
                        ActiveAlerts = alerts.Count,
                        AlertDuplicatesSuppressed = alerts.DuplicatesSuppressed,
                        DisconnectedDevices = disconnected.Snapshot(),
                    }
                );
            }
        );
    }
}
