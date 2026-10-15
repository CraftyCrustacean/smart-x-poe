using backend.Models.State;

namespace backend.Services.State;

public abstract class LockedSet<T>
{
    private readonly HashSet<T> _items = [];
    private readonly Lock _lock = new();
    private long _duplicatesSuppressed;

    public bool TryAdd(T item)
    {
        lock (_lock)
        {
            if (_items.Add(item))
            {
                return true;
            }

            _duplicatesSuppressed++;
            return false;
        }
    }

    public bool Remove(T item)
    {
        lock (_lock)
        {
            return _items.Remove(item);
        }
    }

    public bool Contains(T item)
    {
        lock (_lock)
        {
            return _items.Contains(item);
        }
    }

    public int Count
    {
        get
        {
            lock (_lock)
            {
                return _items.Count;
            }
        }
    }

    public long DuplicatesSuppressed
    {
        get
        {
            lock (_lock)
            {
                return _duplicatesSuppressed;
            }
        }
    }

    public IReadOnlyCollection<T> Snapshot()
    {
        lock (_lock)
        {
            return _items.ToArray();
        }
    }
}

public sealed class DisconnectedDevices : LockedSet<string> { }

public sealed class ActiveAlerts : LockedSet<AlertKey> { }

public sealed class MutedDevices : LockedSet<string> { }

public sealed class AcknowledgedAlerts : LockedSet<AlertKey> { }
