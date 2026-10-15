using backend.Models.Readings;
using backend.Models.Search;
using backend.Models.State;
using backend.Services.History;
using backend.Services.State;
using backend.Services.Telemetry;
using backend.Settings;
using Microsoft.Extensions.Options;
using static backend.Models.Provision.ProvisionData;

namespace backend.Services.Search;

public sealed class DeviceSearchService
{
    public const int PageSize = 20;

    private readonly DeviceRegistry _registry;
    private readonly DisconnectedDevices _disconnected;
    private readonly ActiveAlerts _alerts;
    private readonly MutedDevices _muted;
    private readonly BatchClock _clock;
    private readonly ThresholdEvaluator _thresholds;
    private readonly ReadingHistory<EnvironmentalReading> _environmental;
    private readonly ReadingHistory<FlowRateReading> _flowRate;
    private readonly int _lowBattery;

    public DeviceSearchService(
        DeviceRegistry registry,
        DisconnectedDevices disconnected,
        ActiveAlerts alerts,
        MutedDevices muted,
        BatchClock clock,
        ThresholdEvaluator thresholds,
        ReadingHistory<EnvironmentalReading> environmental,
        ReadingHistory<FlowRateReading> flowRate,
        IOptions<SearchSettings> settings
    )
    {
        _registry = registry;
        _disconnected = disconnected;
        _alerts = alerts;
        _muted = muted;
        _clock = clock;
        _thresholds = thresholds;
        _environmental = environmental;
        _flowRate = flowRate;
        _lowBattery = settings.Value.LowBatteryPct;
    }

    public DeviceSearchPage Search(DeviceSearchQuery query)
    {
        var devices = _registry.Snapshot();
        var offline = new HashSet<string>(_disconnected.Snapshot());
        var muted = new HashSet<string>(_muted.Snapshot());
        var alertsByDevice = _alerts
            .Snapshot()
            .GroupBy(k => k.DeviceId)
            .ToDictionary(g => g.Key, g => g.Select(k => k.Metric).OrderBy(m => m).ToList());
        var now = _clock.Current;

        IEnumerable<DeviceState> matches = devices;

        var text = Normalise(query.Q);
        if (text.Length > 0)
            matches = matches.Where(d =>
                Normalise(d.DeviceId).Contains(text, StringComparison.Ordinal)
            );

        var categories = new HashSet<DeviceCategory>();
        foreach (var c in query.Category ?? [])
            if (Enum.TryParse<DeviceCategory>(c, ignoreCase: true, out var category))
                categories.Add(category);
        if (categories.Count > 0)
            matches = matches.Where(d => categories.Contains(d.Category));

        if (!string.IsNullOrEmpty(query.Zone))
            matches = matches.Where(d => d.Zone == query.Zone);
        if (!string.IsNullOrEmpty(query.Subzone))
            matches = matches.Where(d => d.Subzone == query.Subzone);
        if (query.LowBattery == true)
            matches = matches.Where(d => d.BatteryPct <= _lowBattery);
        if (query.Override == true)
            matches = matches.Where(d => IsActive(d.Override, now));
        if (query.MinKm is { } minKm)
            matches = matches.Where(d => d.ChainageKm >= minKm);
        if (query.MaxKm is { } maxKm)
            matches = matches.Where(d => d.ChainageKm <= maxKm);

        matches = (query.Alert ?? "all").ToLowerInvariant() switch
        {
            "critical" => matches.Where(d => alertsByDevice.ContainsKey(d.DeviceId)),
            "disconnected" => matches.Where(d => offline.Contains(d.DeviceId)),
            "any" => matches.Where(d =>
                alertsByDevice.ContainsKey(d.DeviceId) || offline.Contains(d.DeviceId)
            ),
            _ => matches,
        };

        var results = matches
            .Select(d =>
            {
                var hasAlerts = alertsByDevice.TryGetValue(d.DeviceId, out var metrics);
                return new DeviceSearchResult(
                    d.DeviceId,
                    d.Category,
                    d.Zone,
                    d.Subzone,
                    d.ChainageKm,
                    d.BatteryPct,
                    d.LastSeenUtc,
                    offline.Contains(d.DeviceId),
                    muted.Contains(d.DeviceId),
                    hasAlerts ? metrics! : [],
                    hasAlerts ? LatestSeverity(d) : 0f,
                    IsActive(d.Override, now) ? d.Override : null
                );
            })
            .ToList();

        var sorted = Sort(results, query.Sort);
        var page = Math.Max(1, query.Page ?? 1);

        return new DeviceSearchPage(
            sorted.Count,
            page,
            PageSize,
            _lowBattery,
            sorted.Skip((page - 1) * PageSize).Take(PageSize).ToList()
        );
    }

    public IReadOnlyList<DeviceSuggestion> Suggest(string? q, int limit)
    {
        var text = Normalise(q);
        if (text.Length == 0)
            return [];

        var offline = new HashSet<string>(_disconnected.Snapshot());
        var inAlert = new HashSet<string>(_alerts.Snapshot().Select(k => k.DeviceId));

        return _registry
            .Snapshot()
            .Select(d => (Device: d, Id: Normalise(d.DeviceId)))
            .Select(x => (x.Device, x.Id, At: x.Id.IndexOf(text, StringComparison.Ordinal)))
            .Where(x => x.At >= 0)
            .OrderBy(x => x.At)
            .ThenBy(x => x.Id.Length)
            .ThenBy(x => x.Id, StringComparer.Ordinal)
            .Take(Math.Clamp(limit, 1, 10))
            .Select(x => new DeviceSuggestion(
                x.Device.DeviceId,
                x.Device.Category,
                x.Device.Zone,
                x.Device.Subzone,
                offline.Contains(x.Device.DeviceId),
                inAlert.Contains(x.Device.DeviceId)
            ))
            .ToList();
    }

    private static List<DeviceSearchResult> Sort(List<DeviceSearchResult> results, string? sort) =>
        (sort ?? "alerts").ToLowerInvariant() switch
        {
            "severity" => results
                .OrderByDescending(r => r.Severity)
                .ThenBy(r => r.Zone)
                .ThenBy(r => r.ChainageKm)
                .ToList(),
            "battery" => results
                .OrderBy(r => r.BatteryPct ?? int.MaxValue)
                .ThenBy(r => r.Zone)
                .ThenBy(r => r.ChainageKm)
                .ToList(),
            "lastseen" => results
                .OrderBy(r => r.LastSeenUtc ?? DateTime.MaxValue)
                .ThenBy(r => r.Zone)
                .ThenBy(r => r.ChainageKm)
                .ToList(),
            _ => results
                .OrderByDescending(r => r.ActiveAlerts.Count > 0 || r.Offline)
                .ThenBy(r => r.Zone)
                .ThenBy(r => r.ChainageKm)
                .ToList(),
        };

    private float LatestSeverity(DeviceState device)
    {
        SensorReading? latest = device.Category switch
        {
            DeviceCategory.Environmental => _environmental.GetLatest(device.DeviceId),
            DeviceCategory.FlowRate => _flowRate.GetLatest(device.DeviceId),
            _ => null,
        };
        if (latest is null)
            return 0f;

        var worst = 0f;
        foreach (var check in _thresholds.Evaluate(latest))
            if (check.Severity > worst)
                worst = check.Severity;
        return worst;
    }

    private static bool IsActive(DeviceOverride? o, long now) =>
        o is not null && o.ValidUntilBatch > now;

    private static string Normalise(string? text) =>
        string.IsNullOrWhiteSpace(text)
            ? ""
            : new string(
                text.Where(ch => ch != ':' && ch != '-' && !char.IsWhiteSpace(ch)).ToArray()
            ).ToUpperInvariant();
}
