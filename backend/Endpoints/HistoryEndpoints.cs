using backend.Models.Readings;
using backend.Services.History;
using backend.Services.State;
using static backend.Models.Provision.ProvisionData;

namespace backend.Endpoints;

public static class HistoryEndpoints
{
    public const int DefaultLimit = 500;

    public static void MapHistoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/history");

        group.MapGet(
            "/{deviceId}",
            (
                string deviceId,
                DateOnly? from,
                DateOnly? to,
                int? limit,
                bool? compare,
                DeviceRegistry registry,
                TelemetryHistory<EnvironmentalReading> environmental,
                TelemetryHistory<ActuatorReading> actuator,
                TelemetryHistory<FlowRateReading> flowRate
            ) =>
            {
                if (!registry.TryGet(deviceId, out var state))
                    return Results.NotFound(
                        new { message = $"Device {deviceId} is not registered." }
                    );

                if (from > to)
                    return Results.BadRequest(new { message = "'from' must not be after 'to'." });

                var start = from?.ToDateTime(TimeOnly.MinValue) ?? DateTime.MinValue;
                var end = to?.ToDateTime(TimeOnly.MaxValue) ?? DateTime.MaxValue;
                var take = limit ?? DefaultLimit;
                var scan = compare ?? false;

                return state.Category switch
                {
                    DeviceCategory.Environmental => Results.Ok(
                        environmental.Range(deviceId, start, end, take, scan)
                    ),
                    DeviceCategory.Actuator => Results.Ok(
                        actuator.Range(deviceId, start, end, take, scan)
                    ),
                    DeviceCategory.FlowRate => Results.Ok(
                        flowRate.Range(deviceId, start, end, take, scan)
                    ),
                    _ => Results.NotFound(),
                };
            }
        );

        group.MapGet(
            "/{deviceId}/bounds",
            (
                string deviceId,
                DeviceRegistry registry,
                TelemetryHistory<EnvironmentalReading> environmental,
                TelemetryHistory<ActuatorReading> actuator,
                TelemetryHistory<FlowRateReading> flowRate
            ) =>
            {
                if (!registry.TryGet(deviceId, out var state))
                    return Results.NotFound(
                        new { message = $"Device {deviceId} is not registered." }
                    );

                return state.Category switch
                {
                    DeviceCategory.Environmental => Results.Ok(environmental.Stats(deviceId)),
                    DeviceCategory.Actuator => Results.Ok(actuator.Stats(deviceId)),
                    DeviceCategory.FlowRate => Results.Ok(flowRate.Stats(deviceId)),
                    _ => Results.NotFound(),
                };
            }
        );
    }
}
