namespace backend.Models.Snapshots;

public readonly record struct ScopeKey(string Zone, string? Subzone)
{
    public bool IsZone => Subzone is null;
}

public sealed record MetricSummary(int Count, float Min, float Max, float Average, int Breaching);

public sealed record ScopeSnapshot(
    DateTime BatchTimestamp,
    IReadOnlyDictionary<string, MetricSummary> Metrics
);
