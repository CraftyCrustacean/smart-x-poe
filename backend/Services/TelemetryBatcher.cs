using backend.Models.Telemetry;

namespace backend.Services;

public class TelemetryBatcher
{
    private readonly ILogger<TelemetryBatcher> _logger;
    private DateTime? _currentAnchor;
    private DateTime? _MostRecentPacketArrivalTime;
    private List<TelemetryPacket> _packetsThisBatch = [];
    private (DateTime timestamp, TelemetryPacket[] packet)[] _recentPackets = new (
        DateTime timestamp,
        TelemetryPacket[] packet
    )[7];
    private int _writeIndex = 0;
    private readonly Lock _lock = new();
    private readonly Timer _timer;

    public event Action<TelemetryBatch>? BatchClosed;

    public TelemetryBatcher(ILogger<TelemetryBatcher> logger)
    {
        _logger = logger;
        _timer = new Timer(CheckPacketInterval, null, 0, 1000);
    }

    public void AddPackets(List<TelemetryPacket> packets)
    {
        lock (_lock)
        {
            if (_currentAnchor == null)
            {
                try
                {
                    _currentAnchor = packets.First().TimeStamp;
                }
                catch (InvalidOperationException)
                {
                    _logger.LogWarning("Warning: Something went wrong during batching.");
                    return;
                }
            }

            DateTime upperBound = _currentAnchor.Value.AddMinutes(30);
            DateTime lowerBound = _currentAnchor.Value.AddMinutes(-30);
            _MostRecentPacketArrivalTime = DateTime.Now;
            foreach (var packet in packets)
            {
                if (packet.TimeStamp > lowerBound && packet.TimeStamp < upperBound)
                {
                    _packetsThisBatch.Add(packet);
                }
                else
                {
                    _logger.LogWarning(
                        "Warning: packet outside of acceptable time range. Packet is orphaned and will be dropped."
                    );
                }
            }
        }
    }

    private TelemetryBatch? CloseBatchLocked()
    {
        if (_currentAnchor == null)
        {
            _logger.LogWarning("Cannot create batch with no timestamp anchor.");
            return null;
        }

        var batchTimestamp = _currentAnchor.Value;
        var batchArray = _packetsThisBatch.ToArray();

        _recentPackets[_writeIndex] = (batchTimestamp, batchArray);
        _writeIndex = (_writeIndex + 1) % _recentPackets.Length;
        _currentAnchor = null;
        _packetsThisBatch = [];

        _logger.LogInformation("Batch completed");

        return new TelemetryBatch { Timestamp = batchTimestamp, Packets = [.. batchArray] };
    }

    private void RaiseBatchClosed(TelemetryBatch batch)
    {
        try
        {
            BatchClosed?.Invoke(batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "A batch close handler failed.");
        }
    }

    private void CheckPacketInterval(object? state)
    {
        TelemetryBatch? closed = null;

        lock (_lock)
        {
            if (
                _currentAnchor != null
                && _MostRecentPacketArrivalTime != null
                && (DateTime.Now - _MostRecentPacketArrivalTime.Value).TotalSeconds > 5
            )
            {
                closed = CloseBatchLocked();
                _logger.LogInformation("5 seconds without new packet. Closing Batch.");
            }
        }

        if (closed != null)
        {
            RaiseBatchClosed(closed);
        }
    }

    public List<TelemetryBatch> GetRecentBatches()
    {
        lock (_lock)
        {
            return
            [
                .. _recentPackets
                    .Where(t => t.packet != null)
                    .Select(t => new TelemetryBatch
                    {
                        Timestamp = t.timestamp,
                        Packets = [.. t.packet],
                    }),
            ];
        }
    }
}
