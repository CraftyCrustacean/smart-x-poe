using backend.Models.Search;

namespace backend.Services.Search;

public sealed class SearchClickLog
{
    public const int Capacity = 500;

    private readonly Queue<SearchClick> _clicks = new();
    private readonly Lock _lock = new();

    public void Add(SearchClick click)
    {
        lock (_lock)
        {
            _clicks.Enqueue(click);
            if (_clicks.Count > Capacity)
                _clicks.Dequeue();
        }
    }

    public IReadOnlyList<SearchClick> Snapshot()
    {
        lock (_lock)
        {
            return _clicks.ToArray();
        }
    }
}
