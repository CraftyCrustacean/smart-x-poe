using backend.Models.Readings;
using backend.Models.Telemetry;

namespace backend.Services;

public sealed record QueueStats(
    int FifoDepth,
    int PriorityDepth,
    int SignalCount,
    long EnqueuedFifo,
    long EnqueuedPriority,
    long DequeuedFifo,
    long DequeuedPriority,
    int MaxFifoDepth,
    int MaxOvertaken,
    long TotalOvertaken
);

public sealed class TelemetryQueue
{
    private readonly Queue<QueuedTelemetry> _fifo = new();

    private readonly PriorityQueue<
        (QueuedTelemetry Item, long FifoEnqueuedBefore),
        (float NegatedSeverity, long Sequence)
    > _priority = new();

    private readonly Lock _lock = new();

    private readonly SemaphoreSlim _signal = new(0);

    private long _sequence;
    private long _enqueuedFifo;
    private long _enqueuedPriority;
    private long _dequeuedFifo;
    private long _dequeuedPriority;
    private int _maxFifoDepth;
    private int _maxOvertaken;
    private long _totalOvertaken;

    public void Enqueue(
        SensorReading reading,
        DateTime receivedAtUtc,
        IReadOnlyList<MetricCheck> checks
    )
    {
        lock (_lock)
        {
            var item = new QueuedTelemetry(reading, receivedAtUtc, ++_sequence, checks);

            if (item.IsCritical)
            {
                _priority.Enqueue((item, _enqueuedFifo), (-item.Severity, item.Sequence));
                _enqueuedPriority++;
            }
            else
            {
                _fifo.Enqueue(item);
                _enqueuedFifo++;
                if (_fifo.Count > _maxFifoDepth)
                    _maxFifoDepth = _fifo.Count;
            }
        }

        _signal.Release();
    }

    public async Task<QueuedTelemetry> DequeueAsync(CancellationToken cancellationToken)
    {
        await _signal.WaitAsync(cancellationToken);

        lock (_lock)
        {
            if (_priority.TryDequeue(out var entry, out _))
            {
                _dequeuedPriority++;

                var overtaken = (int)Math.Max(0, entry.FifoEnqueuedBefore - _dequeuedFifo);
                _totalOvertaken += overtaken;
                if (overtaken > _maxOvertaken)
                    _maxOvertaken = overtaken;

                return entry.Item;
            }

            _dequeuedFifo++;
            return _fifo.Dequeue();
        }
    }

    public QueueStats GetStats()
    {
        lock (_lock)
        {
            return new QueueStats(
                _fifo.Count,
                _priority.Count,
                _signal.CurrentCount,
                _enqueuedFifo,
                _enqueuedPriority,
                _dequeuedFifo,
                _dequeuedPriority,
                _maxFifoDepth,
                _maxOvertaken,
                _totalOvertaken
            );
        }
    }
}
