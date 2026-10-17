using backend.Models.State;

namespace backend.Services.State;

public sealed record RaisedAlert(
    AlertKey Key,
    string Zone,
    string Subzone,
    float ChainageKm,
    float Value,
    float Severity,
    long RaisedAtBatch,
    DateTime RaisedAtUtc
);

public sealed class AlertLog
{
    public const int RecentCapacity = 1000;

    private readonly Dictionary<AlertKey, RaisedAlert> _active = new();
    private readonly Queue<RaisedAlert> _recent = new();
    private readonly Lock _lock = new();

    public void Raised(RaisedAlert alert)
    {
        lock (_lock)
        {
            _active[alert.Key] = alert;
            _recent.Enqueue(alert);
            if (_recent.Count > RecentCapacity)
                _recent.Dequeue();
        }
    }

    public void Cleared(AlertKey key)
    {
        lock (_lock)
        {
            _active.Remove(key);
        }
    }

    public IReadOnlyList<RaisedAlert> Active()
    {
        lock (_lock)
        {
            return _active.Values.ToList();
        }
    }

    public IReadOnlyList<RaisedAlert> CandidatesFor(string zone, string subzone, long sinceBatch)
    {
        lock (_lock)
        {
            return _active
                .Values.Concat(_recent.Where(a => a.RaisedAtBatch >= sinceBatch))
                .Where(a => a.Zone == zone && a.Subzone == subzone)
                .ToList();
        }
    }
}
