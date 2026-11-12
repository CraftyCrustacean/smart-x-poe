using backend.Models.Mesh;

namespace backend.Services.Mesh;

public sealed record MeshSnapshot(
    MeshTopology Topology,
    long Batch,
    DateTime ComputedAtUtc,
    double RebuildMs,
    bool[] Online,
    NodeStatus[] Status,
    int[] BfsParent,
    int[] BfsHops,
    int[] MstParent,
    int[] MstHops,
    int[] HealthyMstParent,
    int[] DijkstraParent,
    float[] DijkstraCost,
    float MstTotalCost,
    float AllLinksCost,
    IReadOnlyList<HealingEntry> Healing,
    MeshCounts Counts
)
{
    public MeshSummary ToSummary() =>
        new(Batch, ComputedAtUtc, Topology.Vertices.Length, Counts, MstTotalCost, RebuildMs);
}
