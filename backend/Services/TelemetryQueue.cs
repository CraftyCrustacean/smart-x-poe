using backend.Models.Readings;
using backend.Models.Telemetry;

namespace backend.Services;

public sealed record QueueStats(
    int FifoDepth,
    int SignalCount,
    long Enqueued,
    long Dequeued,
    int MaxFifoDepth
);

public sealed class TelemetryQueue
{
    private readonly Queue<QueuedTelemetry> _fifo = new();
    private readonly Lock _lock = new();

    private readonly SemaphoreSlim _signal = new(0);

    private long _sequence;
    private long _enqueued;
    private long _dequeued;
    private int _maxFifoDepth;

    public void Enqueue(SensorReading reading, DateTime receivedAtUtc)
    {
        lock (_lock)
        {
            _fifo.Enqueue(new QueuedTelemetry(reading, receivedAtUtc, ++_sequence));
            _enqueued++;
            if (_fifo.Count > _maxFifoDepth)
                _maxFifoDepth = _fifo.Count;
        }

        _signal.Release();
    }

    public async Task<QueuedTelemetry> DequeueAsync(CancellationToken cancellationToken)
    {
        await _signal.WaitAsync(cancellationToken);

        lock (_lock)
        {
            _dequeued++;
            return _fifo.Dequeue();
        }
    }

    public QueueStats GetStats()
    {
        lock (_lock)
        {
            return new QueueStats(
                _fifo.Count,
                _signal.CurrentCount,
                _enqueued,
                _dequeued,
                _maxFifoDepth
            );
        }
    }
}
