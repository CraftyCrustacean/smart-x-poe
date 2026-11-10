using System.Collections.Concurrent;
using System.Diagnostics;
using backend.Models.History;
using backend.Models.Readings;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Services.History;

public sealed class TelemetryHistory<TReading>
    where TReading : SensorReading
{
    public const int TimelineLength = 30;

    private sealed class DeviceHistory
    {
        public readonly Lock Gate = new();
        public readonly AvlTree<HistoryKey, TReading> Tree = new();
    }

    private readonly ConcurrentDictionary<string, DeviceHistory> _byDevice = new();
    private readonly int _capacity;

    public TelemetryHistory(IOptions<MeshSettings> settings)
    {
        _capacity = Math.Max(1, settings.Value.HistoryCapacity);
    }

    public int Capacity => _capacity;

    public void Add(TReading reading, long sequence)
    {
        var history = _byDevice.GetOrAdd(reading.DeviceId, static _ => new DeviceHistory());

        lock (history.Gate)
        {
            history.Tree.Insert(new HistoryKey(reading.TimeStamp, sequence), reading);

            while (history.Tree.Count > _capacity)
                history.Tree.RemoveMin();
        }
    }

    public TReading? Latest(string deviceId)
    {
        if (!_byDevice.TryGetValue(deviceId, out var history))
            return null;

        lock (history.Gate)
            return history.Tree.TryGetMax(out _, out var reading) ? reading : null;
    }

    public IReadOnlyList<TReading> Recent(string deviceId, int count = TimelineLength)
    {
        if (!_byDevice.TryGetValue(deviceId, out var history))
            return [];

        lock (history.Gate)
            return history.Tree.Last(count);
    }

    public HistoryQueryResult<TReading> Range(string deviceId, DateTime from, DateTime to, int limit)
    {
        limit = Math.Clamp(limit, 1, _capacity);

        if (!_byDevice.TryGetValue(deviceId, out var history))
            return new HistoryQueryResult<TReading>(deviceId, 0, 0, 0, 0, 0, 0, false, 0, []);

        lock (history.Gate)
        {
            var tree = history.Tree;
            var started = Stopwatch.GetTimestamp();

            var rows = tree.Range(
                HistoryKey.StartOf(from),
                HistoryKey.EndOf(to),
                limit + 1,
                out var visited
            );

            var elapsed = Stopwatch.GetElapsedTime(started).TotalMicroseconds;

            var truncated = rows.Count > limit;
            if (truncated)
                rows.RemoveAt(0);

            return new HistoryQueryResult<TReading>(
                deviceId,
                tree.Count,
                tree.Height,
                tree.MaxPossibleHeight,
                tree.Rotations,
                visited,
                rows.Count,
                truncated,
                elapsed,
                rows
            );
        }
    }

    public HistoryStats Stats(string deviceId)
    {
        if (!_byDevice.TryGetValue(deviceId, out var history))
            return new HistoryStats(deviceId, 0, 0, 0, 0, null, null);

        lock (history.Gate)
        {
            var tree = history.Tree;
            DateTime? oldest = tree.TryGetMin(out var first, out _) ? first.Time : null;
            DateTime? newest = tree.TryGetMax(out var last, out _) ? last.Time : null;

            return new HistoryStats(
                deviceId,
                tree.Count,
                tree.Height,
                tree.MaxPossibleHeight,
                tree.Rotations,
                oldest,
                newest
            );
        }
    }
}
