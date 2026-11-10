namespace backend.Models.History;

public sealed record HistoryStats(
    string DeviceId,
    int Stored,
    int TreeHeight,
    int MaxAvlHeight,
    long Rotations,
    DateTime? Oldest,
    DateTime? Newest
);

public sealed record HistoryQueryResult<TReading>(
    string DeviceId,
    int Stored,
    int TreeHeight,
    int MaxAvlHeight,
    long Rotations,
    int VisitedNodes,
    int Returned,
    bool Truncated,
    double ElapsedMicroseconds,
    IReadOnlyList<TReading> Rows
);
