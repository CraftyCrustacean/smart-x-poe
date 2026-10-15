using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using backend.Models.Provision;
using backend.Models.State;

namespace backend.Services.State;

public enum TelemetryUpdateResult
{
    Applied,
    Stale,
    UnknownDevice,
}

public class DeviceRegistry
{
    private readonly ConcurrentDictionary<string, DeviceState> _devices = new();

    public int Count => _devices.Count;

    public bool Register(ProvisionData data)
    {
        return _devices.TryAdd(data.DeviceId, DeviceState.FromProvision(data));
    }

    public bool TryGet(string deviceId, [NotNullWhen(true)] out DeviceState? state)
    {
        return _devices.TryGetValue(deviceId, out state);
    }

    // Create a copy of the current device states, safe to enumerate without locking the registry.
    public IReadOnlyCollection<DeviceState> Snapshot()
    {
        return _devices.Values.ToArray();
    }

    public TelemetryUpdateResult RecordTelemetry(
        string deviceId,
        DateTime receivedAtUtc,
        int batteryPct
    )
    {
        while (true)
        {
            if (!_devices.TryGetValue(deviceId, out var current))
                return TelemetryUpdateResult.UnknownDevice;

            // If the telemetry is older than the last seen timestamp, ignore it. Prevents stale packets.
            if (current.LastSeenUtc is { } lastSeen && receivedAtUtc <= lastSeen)
                return TelemetryUpdateResult.Stale;

            var updated = current with { LastSeenUtc = receivedAtUtc, BatteryPct = batteryPct };

            if (_devices.TryUpdate(deviceId, updated, current))
                return TelemetryUpdateResult.Applied;
        }
    }

    public bool TryApply(
        string deviceId,
        Func<DeviceState, DeviceState> change,
        out DeviceState? before
    )
    {
        while (true)
        {
            if (!_devices.TryGetValue(deviceId, out var current))
            {
                before = null;
                return false;
            }

            if (_devices.TryUpdate(deviceId, change(current), current))
            {
                before = current;
                return true;
            }
        }
    }
}
