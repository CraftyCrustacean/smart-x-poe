using backend.Models.Telemetry;

namespace backend.Services;

public class TelemetryBatcher
{
    private readonly ILogger<TelemetryBatcher> _logger;
    private DateTime? _currentAnchor;
    private DateTime? _MostRecentPacketArrivalTime;
    private List<TelemetryPacket> _packetsThisBatch = [];
    private (DateTime timestamp, TelemetryPacket[] packet)[] _recentPackets = new (DateTime timestamp, TelemetryPacket[] packet)[7];
    private int _writeIndex = 0;
    private readonly Lock _lock = new();
    private readonly Timer _timer;


    public TelemetryBatcher(ILogger<TelemetryBatcher> logger)
    {
        _logger = logger;
        _timer = new Timer (CheckPacketInterval, null, 0, 1000);
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
                    _logger.LogWarning("Warning: packet outside of acceptable time range. Packet is orphaned and will be dropped.");
                }
            }
        }
    }

    public void CloseBatch()
    {
        lock (_lock) {
            DateTime batchTimestamp;
            TelemetryPacket[] batchArray = _packetsThisBatch.ToArray();
            (DateTime timestamp, TelemetryPacket[] packet) batchItem;

            if (_currentAnchor != null)
            {
                batchTimestamp = (DateTime)_currentAnchor;
                batchItem = (batchTimestamp, batchArray);
                _recentPackets[_writeIndex] = batchItem;
                _writeIndex = (_writeIndex + 1) % _recentPackets.Length;
                _currentAnchor = null;
                _packetsThisBatch = [];

                _logger.LogInformation("Batch completed");
            }
            else
            {
                _logger.LogWarning("Cannot create batch with no timestamp anchor.");
            }
        }
    }

    private void CheckPacketInterval(object? state)
    {
        lock (_lock)
        {
            if (_currentAnchor != null && _MostRecentPacketArrivalTime != null)
            {
                TimeSpan timeDelta = (DateTime.Now - _MostRecentPacketArrivalTime.Value);

                if (timeDelta.TotalSeconds > 5)
                {
                    CloseBatch();
                    _logger.LogInformation("5 seconds without new packet. Closing Batch.");
                }
            }
        }
    }

    public (DateTime timestamp, TelemetryPacket[] packet)[] GetRecentBatches()
    {
        return [.. _recentPackets];
    }

}

