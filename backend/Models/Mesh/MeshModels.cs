using static backend.Models.Provision.ProvisionData;

namespace backend.Models.Mesh;

public sealed record MeshVertex(
    string Id,
    double Latitude,
    double Longitude,
    string? Zone,
    string? Subzone,
    DeviceCategory? Category,
    float? ChainageKm,
    bool IsGateway
);

public readonly record struct MeshEdge(int To, float Cost);

public readonly record struct MeshLink(int A, int B, float DistanceKm, float Cost);

public sealed record MeshTopologyDto(
    string GatewayId,
    double RadioRangeKm,
    double HopOverhead,
    double BuildMs,
    int VertexCount,
    int LinkCount,
    IReadOnlyList<MeshVertex> Vertices,
    IReadOnlyList<MeshLink> Links
);
