using backend.Models.Telemetry;

namespace backend.Services;

public sealed record DisconnectResult(
    int NewlyDisconnected,
    int Reconnected,
    int TotalDisconnected
);

public sealed class DisconnectDetector
{
    private readonly DeviceRegistry _registry;
    private readonly DisconnectedDevices _disconnected;
    private readonly ILogger<DisconnectDetector> _logger;

    public DisconnectDetector(
        DeviceRegistry registry,
        DisconnectedDevices disconnected,
        ILogger<DisconnectDetector> logger
    )
    {
        _registry = registry;
        _disconnected = disconnected;
        _logger = logger;
    }

    public DisconnectResult Detect(TelemetryBatch batch)
    {
        var reported = new HashSet<string>(batch.Packets.Select(p => p.DeviceId));

        var newlyDisconnected = 0;
        var reconnected = 0;

        foreach (var device in _registry.Snapshot())
        {
            if (reported.Contains(device.DeviceId))
            {
                if (_disconnected.Remove(device.DeviceId))
                {
                    reconnected++;
                    _logger.LogInformation("Device {DeviceId} reconnected.", device.DeviceId);
                }
            }
            else if (device.LastSeenUtc is not null)
            {
                if (_disconnected.TryAdd(device.DeviceId))
                {
                    newlyDisconnected++;
                    _logger.LogWarning("Device {DeviceId} disconnected.", device.DeviceId);
                }
            }
        }

        return new DisconnectResult(newlyDisconnected, reconnected, _disconnected.Count);
    }
}
