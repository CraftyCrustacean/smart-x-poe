using backend.Models.Provision;
using static backend.Models.Provision.ProvisionData;

namespace backend.Models.State;

public sealed record DeviceState
{
    public required string DeviceId { get; init; }
    public required DeviceCategory Category { get; init; }
    public required string Zone { get; init; }
    public required string Subzone { get; init; }
    public required float ChainageKm { get; init; }
    public DateTime? LastSeenUtc { get; init; }
    public int? BatteryPct { get; init; }

    public static DeviceState FromProvision(ProvisionData data) => new()
    {
        DeviceId = data.DeviceId,
        Category = data.Category,
        Zone = data.TopologyData.Zone,
        Subzone = data.TopologyData.Subzone,
        ChainageKm = data.LocationData.Chainage,
    };
}