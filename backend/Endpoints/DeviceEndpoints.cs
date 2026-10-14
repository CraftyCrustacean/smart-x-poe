using backend.Models.Provision;
using backend.Models.Readings;
using backend.Services.History;
using backend.Services.Persistence;
using backend.Services.State;
using backend.Services.Topology;
using static backend.Models.Provision.ProvisionData;

namespace backend.Endpoints;

public static class DeviceEndpoints
{
    public static void MapDeviceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/devices");

        // POST /api/devices
        group.MapPost(
            "/",
            async (
                DeviceRegistrationRequest request,
                DeviceRegistry registry,
                DeviceStore store,
                PipelineData pipelineData
            ) =>
            {
                if (await store.DeviceExists(request.DeviceId))
                {
                    return Results.Conflict(
                        new
                        {
                            message = $"Device with id {request.DeviceId} already exists in persistent storage.",
                        }
                    );
                }

                if (!pipelineData.TryGetPipeLength(request.Topology.Zone, out var pipeLengthKm))
                {
                    return Results.BadRequest(
                        new { message = $"Unknown pipeline/zone: {request.Topology.Zone}." }
                    );
                }

                if (request.Location.Chainage < 0 || request.Location.Chainage > pipeLengthKm)
                {
                    return Results.BadRequest(
                        new
                        {
                            message = $"Chainage {request.Location.Chainage} km is out of range for zone "
                                + $"{request.Topology.Zone} (valid range: 0.0 to {pipeLengthKm} km).",
                        }
                    );
                }

                int subzoneIndex = (int)(request.Location.Chainage / 50.0f) + 1;
                string subzone = $"Subzone-{subzoneIndex}";

                var now = DateTime.UtcNow;
                var provisionedAt = new DateTime(
                    now.Year,
                    now.Month,
                    now.Day,
                    now.Hour,
                    now.Minute,
                    0,
                    DateTimeKind.Utc
                );

                var provisionData = new ProvisionData
                {
                    DeviceId = request.DeviceId,
                    MacAddress = request.MacAddress,
                    Category = request.Category,
                    ProductType = request.ProductType,
                    FirmwareVersion = request.FirmwareVersion,
                    ProvisionedAt = provisionedAt,
                    Status = DeviceStatus.inactive,

                    LocationData = new LocationData
                    {
                        Latitude = request.Location.Latitude,
                        Longitude = request.Location.Longitude,
                        Chainage = request.Location.Chainage,
                    },

                    TopologyData = new TopologyData
                    {
                        Region = request.Topology.Region,
                        Zone = request.Topology.Zone,
                        Subzone = subzone,
                    },
                };

                await store.UpsertDevice(provisionData);
                registry.Register(provisionData);

                return Results.Created($"/api/devices/{provisionData.DeviceId}", provisionData);
            }
        );

        // GET /api/devices
        group.MapGet(
            "/",
            async (DeviceStore store) =>
            {
                return Results.Ok(await store.GetAllDevices());
            }
        );

        // GET /api/devices/{deviceId}/state
        group.MapGet(
            "/{deviceId}/state",
            (string deviceId, DeviceRegistry registry) =>
                registry.TryGet(deviceId, out var state)
                    ? Results.Ok(state)
                    : Results.NotFound(new { message = $"Device {deviceId} is not registered." })
        );

        // GET /api/devices/{deviceId}/readings
        group.MapGet(
            "/{deviceId}/readings",
            (
                string deviceId,
                DeviceRegistry registry,
                ReadingHistory<EnvironmentalReading> environmental,
                ReadingHistory<ActuatorReading> actuator,
                ReadingHistory<FlowRateReading> flowRate
            ) =>
            {
                if (!registry.TryGet(deviceId, out var state))
                    return Results.NotFound(
                        new { message = $"Device {deviceId} is not registered." }
                    );

                return state.Category switch
                {
                    DeviceCategory.Environmental => Results.Ok(environmental.GetTimeline(deviceId)),
                    DeviceCategory.Actuator => Results.Ok(actuator.GetTimeline(deviceId)),
                    DeviceCategory.FlowRate => Results.Ok(flowRate.GetTimeline(deviceId)),
                    _ => Results.NotFound(),
                };
            }
        );
    }
}
