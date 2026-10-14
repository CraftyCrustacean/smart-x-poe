using static backend.Models.Provision.ProvisionData;

namespace backend.Models.Live;

public sealed record CategoryCount(DeviceCategory Category, int Total, int Offline);

public sealed record DashboardSummary(
    DateTime? LastBatchTimestamp,
    int LastBatchPackets,
    int Registered,
    int NeverReported,
    int Offline,
    int ActiveAlerts,
    IReadOnlyList<CategoryCount> Categories
);

public sealed record AlertEvent(
    string DeviceId,
    string Zone,
    string Subzone,
    string Metric,
    float Value,
    float Severity,
    DateTime ReadingTimestamp,
    DateTime RaisedAtUtc
);
