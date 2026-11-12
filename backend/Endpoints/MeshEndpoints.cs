using backend.Models.Mesh;
using backend.Services;
using backend.Services.Mesh;
using backend.Services.State;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Endpoints;

public static class MeshEndpoints
{
    public static void MapMeshEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/mesh");

        group.MapGet(
            "/topology",
            (MeshService mesh, IOptions<MeshSettings> options) =>
            {
                var topology = mesh.GetTopology();
                var settings = options.Value;

                return Results.Ok(
                    new MeshTopologyDto(
                        settings.GatewayId,
                        settings.RadioRangeKm,
                        settings.HopOverhead,
                        topology.BuildMs,
                        topology.Vertices.Length,
                        topology.Links.Length,
                        topology.Vertices,
                        topology.Links
                    )
                );
            }
        );

        group.MapGet("/state", (MeshService mesh) => Results.Ok(MeshReports.State(mesh.GetSnapshot())));

        group.MapGet(
            "/routes/{deviceId}",
            (string deviceId, MeshService mesh) =>
            {
                var snapshot = mesh.GetSnapshot();
                return snapshot.Topology.IndexOf.TryGetValue(deviceId, out var v)
                    ? Results.Ok(MeshReports.Routes(snapshot, v))
                    : NotInMesh(deviceId);
            }
        );

        group.MapGet(
            "/reachability",
            (string? from, string? zone, string? subzone, MeshService mesh) =>
            {
                var snapshot = mesh.GetSnapshot();
                var source = MeshTopology.Gateway;
                if (from is not null && !snapshot.Topology.IndexOf.TryGetValue(from, out source))
                    return NotInMesh(from);

                return Results.Ok(MeshReports.Reachability(snapshot, source, zone, subzone));
            }
        );

        group.MapGet("/healing", (MeshService mesh) => Results.Ok(MeshReports.Healing(mesh.GetSnapshot())));

        group.MapPost(
            "/failures",
            (FailureRequest request, MeshService mesh, DeviceRegistry registry, LiveUpdates live) =>
            {
                if (request.Scope is null)
                    return Results.BadRequest(new { message = "'scope' is required: device, point or subzone." });

                var targets = ResolveTargets(request, registry);
                if (targets.Error is not null)
                    return targets.Error;

                var (changed, snapshot) = mesh.Fail(targets.DeviceIds);
                return Changed(changed, snapshot, mesh, live);
            }
        );

        group.MapPost(
            "/failures/restore",
            (FailureRequest? request, MeshService mesh, DeviceRegistry registry, LiveUpdates live) =>
            {
                IReadOnlyList<string>? ids = null;
                if (request?.Scope is not null)
                {
                    var targets = ResolveTargets(request, registry);
                    if (targets.Error is not null)
                        return targets.Error;
                    ids = targets.DeviceIds;
                }

                var (changed, snapshot) = mesh.Restore(ids);
                return Changed(changed, snapshot, mesh, live);
            }
        );
    }

    private static IResult Changed(int changed, MeshSnapshot snapshot, MeshService mesh, LiveUpdates live)
    {
        var summary = snapshot.ToSummary();
        if (changed > 0)
            live.MeshChanged(summary);

        return Results.Ok(new FailureResultDto(changed, mesh.FailedCount, summary));
    }

    private static IResult NotInMesh(string deviceId) =>
        Results.NotFound(new { message = $"{deviceId} is not in the mesh." });

    private sealed record Targets(IReadOnlyList<string> DeviceIds, IResult? Error);

    private static Targets ResolveTargets(FailureRequest request, DeviceRegistry registry)
    {
        static Targets Fail(IResult error) => new([], error);

        switch (request.Scope)
        {
            case FailureScope.Device:
            case FailureScope.Point:
                if (string.IsNullOrWhiteSpace(request.DeviceId))
                    return Fail(Results.BadRequest(new { message = "'deviceId' is required for this scope." }));
                if (!registry.TryGet(request.DeviceId, out var device))
                    return Fail(NotInMesh(request.DeviceId));
                if (request.Scope == FailureScope.Device)
                    return new([device.DeviceId], null);

                return new(
                    [
                        .. registry
                            .Snapshot()
                            .Where(d => d.Zone == device.Zone && Math.Abs(d.ChainageKm - device.ChainageKm) < 0.001f)
                            .Select(d => d.DeviceId),
                    ],
                    null
                );

            case FailureScope.Subzone:
                if (string.IsNullOrWhiteSpace(request.Zone) || string.IsNullOrWhiteSpace(request.Subzone))
                    return Fail(Results.BadRequest(new { message = "'zone' and 'subzone' are required for this scope." }));

                var ids = registry
                    .Snapshot()
                    .Where(d => d.Zone == request.Zone && d.Subzone == request.Subzone)
                    .Select(d => d.DeviceId)
                    .ToList();
                return ids.Count > 0
                    ? new(ids, null)
                    : Fail(Results.NotFound(new { message = $"No devices in {request.Zone} {request.Subzone}." }));

            default:
                return Fail(Results.BadRequest(new { message = "Unknown scope." }));
        }
    }
}
