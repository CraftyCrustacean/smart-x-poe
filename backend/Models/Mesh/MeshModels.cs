using System.Text.Json.Serialization;
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

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NodeStatus
{
    Online,
    Offline,
    Failed,
    CutOff,
}

public sealed record MeshCounts(int Devices, int Online, int Offline, int Failed, int CutOff);

public sealed record MeshSummary(
    long Batch,
    DateTime ComputedAtUtc,
    int VertexCount,
    MeshCounts Counts,
    float MstTotalCost,
    double RebuildMs
);

public sealed record HealingEntry(
    int Down,
    int Dependant,
    int? NewNextHop,
    int? NewHops,
    float? NewCost
);

public sealed record MeshStateDto(
    MeshSummary Summary,
    float AllLinksCost,
    double MstPercentOfAllLinks,
    int LongestFewestHops,
    int LongestMstHops,
    NodeStatus[] Status,
    int[] MstParent,
    int[] BfsHops
);

public sealed record RouteStepDto(string From, string To, double DistanceKm, float Cost);

public sealed record MeshRouteDto(
    IReadOnlyList<string> Path,
    int Hops,
    float? Cost,
    IReadOnlyList<RouteStepDto> Steps
);

public sealed record DeviceRoutesDto(
    string DeviceId,
    NodeStatus Status,
    string? Message,
    MeshRouteDto FewestHops,
    MeshRouteDto Mst,
    MeshRouteDto Cheapest,
    IReadOnlyList<HealingEntryDto> Healing
);

public sealed record HealingEntryDto(
    string Down,
    NodeStatus DownStatus,
    string Dependant,
    string? NewNextHop,
    int? NewHops,
    float? NewCost
);

public sealed record HealingReportDto(
    long Batch,
    int Down,
    int CutOff,
    IReadOnlyList<HealingEntryDto> Entries
);

public sealed record SubzoneReachabilityDto(
    string Zone,
    string Subzone,
    int Total,
    int Reachable,
    int Unreachable,
    int Down
);

public sealed record ReachabilityDto(
    string From,
    NodeStatus FromStatus,
    string? Zone,
    string? Subzone,
    int Reachable,
    int Unreachable,
    int Down,
    IReadOnlyList<SubzoneReachabilityDto> Subzones,
    IReadOnlyList<string> ReachableIds,
    IReadOnlyList<string> UnreachableIds,
    IReadOnlyList<string> DownIds
);

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FailureScope
{
    Device,
    Point,
    Subzone,
}

public sealed record FailureRequest(
    FailureScope? Scope,
    string? DeviceId,
    string? Zone,
    string? Subzone
);

public sealed record FailureResultDto(int Changed, int TotalFailed, MeshSummary Summary);
