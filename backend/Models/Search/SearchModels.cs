using backend.Models.State;
using static backend.Models.Provision.ProvisionData;

namespace backend.Models.Search;

public sealed class DeviceSearchQuery
{
    public string? Q { get; set; }
    public string[]? Category { get; set; }
    public string? Alert { get; set; }
    public string? Zone { get; set; }
    public string? Subzone { get; set; }
    public bool? LowBattery { get; set; }
    public bool? Override { get; set; }
    public float? MinKm { get; set; }
    public float? MaxKm { get; set; }
    public string? Sort { get; set; }
    public int? Page { get; set; }
}

public sealed record DeviceSearchResult(
    string DeviceId,
    DeviceCategory Category,
    string Zone,
    string Subzone,
    float ChainageKm,
    int? BatteryPct,
    DateTime? LastSeenUtc,
    bool Offline,
    bool Muted,
    IReadOnlyList<string> ActiveAlerts,
    float Severity,
    DeviceOverride? ActiveOverride
);

public sealed record DeviceSearchPage(
    int Total,
    int Page,
    int PageSize,
    int LowBatteryPct,
    IReadOnlyList<DeviceSearchResult> Results
);

public sealed record DeviceSuggestion(
    string DeviceId,
    DeviceCategory Category,
    string Zone,
    string Subzone,
    bool Offline,
    bool InAlert
);

public sealed record SearchClickRequest(string DeviceId, Dictionary<string, string[]>? Filters);

public sealed record SearchClick(
    DateTime AtUtc,
    string DeviceId,
    string Zone,
    string Subzone,
    IReadOnlyDictionary<string, string[]> Filters
);
