using backend.Models.Mesh;
using backend.Services.Mesh;
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
    }
}
