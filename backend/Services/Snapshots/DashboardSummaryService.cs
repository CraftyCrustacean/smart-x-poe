using backend.Models.Live;
using backend.Models.Telemetry;
using backend.Services.State;

namespace backend.Services.Snapshots;

public sealed class DashboardSummaryService
{
    private readonly DeviceRegistry _registry;
    private readonly DisconnectedDevices _disconnected;
    private readonly ActiveAlerts _alerts;

    private readonly Lock _lock = new();
    private DateTime? _lastBatchTimestamp;
    private int _lastBatchPackets;

    public DashboardSummaryService(
        DeviceRegistry registry,
        DisconnectedDevices disconnected,
        ActiveAlerts alerts
    )
    {
        _registry = registry;
        _disconnected = disconnected;
        _alerts = alerts;
    }

    public void RecordBatch(TelemetryBatch batch)
    {
        lock (_lock)
        {
            _lastBatchTimestamp = batch.Timestamp;
            _lastBatchPackets = batch.Packets.Count;
        }
    }

    public DashboardSummary Build()
    {
        DateTime? lastBatch;
        int lastPackets;
        lock (_lock)
        {
            lastBatch = _lastBatchTimestamp;
            lastPackets = _lastBatchPackets;
        }

        var devices = _registry.Snapshot();
        var offline = new HashSet<string>(_disconnected.Snapshot());

        var categories = devices
            .GroupBy(d => d.Category)
            .OrderBy(g => g.Key)
            .Select(g => new CategoryCount(
                g.Key,
                g.Count(),
                g.Count(d => offline.Contains(d.DeviceId))
            ))
            .ToList();

        return new DashboardSummary(
            lastBatch,
            lastPackets,
            devices.Count,
            devices.Count(d => d.LastSeenUtc is null),
            offline.Count,
            _alerts.Count,
            categories
        );
    }
}
