using backend.Models.Snapshots;

namespace backend.Services;

public sealed class SnapshotStore
{
    public const int Capacity = 30;

    private readonly Dictionary<ScopeKey, SortedDictionary<DateTime, ScopeSnapshot>> _byScope = [];
    private readonly Lock _lock = new();

    public void AddBatch(IReadOnlyDictionary<ScopeKey, ScopeSnapshot> snapshots)
    {
        lock (_lock)
        {
            foreach (var (scope, snapshot) in snapshots)
            {
                if (!_byScope.TryGetValue(scope, out var timeline))
                {
                    timeline = new SortedDictionary<DateTime, ScopeSnapshot>();
                    _byScope[scope] = timeline;
                }

                timeline[snapshot.BatchTimestamp] = snapshot;

                if (timeline.Count > Capacity)
                {
                    timeline.Remove(timeline.Keys.First());
                }
            }
        }
    }

    public IReadOnlyList<ScopeSnapshot> GetSeries(ScopeKey scope, int points)
    {
        lock (_lock)
        {
            if (!_byScope.TryGetValue(scope, out var timeline))
            {
                return [];
            }

            return timeline.Values.Skip(Math.Max(0, timeline.Count - points)).ToList();
        }
    }

    public ScopeSnapshot? GetLatest(ScopeKey scope)
    {
        lock (_lock)
        {
            return _byScope.TryGetValue(scope, out var timeline) && timeline.Count > 0
                ? timeline.Values.Last()
                : null;
        }
    }

    public IReadOnlyList<ScopeKey> GetScopes()
    {
        lock (_lock)
        {
            return _byScope.Keys.ToList();
        }
    }
}
