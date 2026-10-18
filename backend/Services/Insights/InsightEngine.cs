using backend.Models.Commands;
using backend.Models.Insights;
using backend.Models.Readings;
using backend.Models.Search;
using backend.Models.State;
using backend.Services.History;
using backend.Services.State;
using backend.Services.Telemetry;
using backend.Settings;
using Microsoft.Extensions.Options;
using static backend.Models.Provision.ProvisionData;

namespace backend.Services.Insights;

public sealed class InsightEngine
{
    public const int RecencyBatches = 6;
    public const int MinSupport = 3;
    public const int NeglectedBatches = 6;
    public const int LongOfflineBatches = 3;
    public const int DriftRecent = 5;
    public const float DriftMinPosition = 0.5f;
    public const float DriftMinMove = 0.25f;
    public const int MaxSuggestions = 5;

    private readonly Dictionary<string, Dictionary<ActionKey, int>> _transitions = new();
    private readonly Dictionary<long, (string Metric, ActionKey Action)> _creditedCommands = new();
    private readonly HashSet<string> _dismissed = new();
    private readonly Lock _lock = new();
    private readonly Lock _rebuildLock = new();

    private volatile IReadOnlyList<Suggestion> _candidates = [];

    private readonly DeviceRegistry _registry;
    private readonly AlertLog _alertLog;
    private readonly AcknowledgedAlerts _acknowledged;
    private readonly MutedDevices _muted;
    private readonly DisconnectDetector _disconnects;
    private readonly BatchClock _clock;
    private readonly ThresholdEvaluator _thresholds;
    private readonly ReadingHistory<EnvironmentalReading> _environmental;
    private readonly ReadingHistory<FlowRateReading> _flowRate;
    private readonly int _lowBattery;

    public InsightEngine(
        DeviceRegistry registry,
        AlertLog alertLog,
        AcknowledgedAlerts acknowledged,
        MutedDevices muted,
        DisconnectDetector disconnects,
        BatchClock clock,
        ThresholdEvaluator thresholds,
        ReadingHistory<EnvironmentalReading> environmental,
        ReadingHistory<FlowRateReading> flowRate,
        IOptions<SearchSettings> search
    )
    {
        _registry = registry;
        _alertLog = alertLog;
        _acknowledged = acknowledged;
        _muted = muted;
        _disconnects = disconnects;
        _clock = clock;
        _thresholds = thresholds;
        _environmental = environmental;
        _flowRate = flowRate;
        _lowBattery = search.Value.LowBatteryPct;
    }

    public IReadOnlyList<Suggestion> Current(string? type) =>
        TopK(
            string.IsNullOrEmpty(type)
                ? _candidates
                : _candidates.Where(s => (s.Cause.Metric ?? s.Cause.Type) == type),
            MaxSuggestions
        );

    public void LearnFromCommand(CommandRecord record)
    {
        string zone,
            subzone;
        var deviceId = record.Target.DeviceId;

        if (deviceId is not null)
        {
            if (!_registry.TryGet(deviceId, out var device))
                return;
            (zone, subzone) = (device.Zone, device.Subzone);
        }
        else if (record.Target is { Zone: { } z, Subzone: { } s })
        {
            (zone, subzone) = (z, s);
        }
        else
        {
            return;
        }

        var alert = NearestAlert(zone, subzone, record.IssuedAtBatch);
        if (alert is null)
            return;

        var action = new ActionKey(record.Type.ToString(), ScopeOf(alert, deviceId));
        lock (_lock)
        {
            Increment(alert.Key.Metric, action);
            _creditedCommands[record.Id] = (alert.Key.Metric, action);
        }
    }

    public void ForgetCommand(CommandRecord undone)
    {
        lock (_lock)
        {
            if (_creditedCommands.Remove(undone.Id, out var credit))
                Decrement(credit.Metric, credit.Action);
        }
    }

    public void LearnFromClick(SearchClick click)
    {
        var alert = NearestAlert(click.Zone, click.Subzone, _clock.Current);
        if (alert is null)
            return;

        lock (_lock)
        {
            Increment(alert.Key.Metric, new ActionKey("Inspect", ScopeOf(alert, click.DeviceId)));
        }
    }

    private RaisedAlert? NearestAlert(string zone, string subzone, long atBatch) =>
        _alertLog
            .CandidatesFor(zone, subzone, atBatch - RecencyBatches)
            .Where(a => a.RaisedAtBatch <= atBatch)
            .OrderByDescending(a => a.RaisedAtBatch)
            .ThenByDescending(a => a.Severity)
            .FirstOrDefault();

    private string ScopeOf(RaisedAlert alert, string? deviceId)
    {
        if (deviceId is null)
            return "Subzone";
        if (deviceId == alert.Key.DeviceId)
            return "Device";
        return _registry.TryGet(deviceId, out var d) ? d.Category.ToString() : "Device";
    }

    private void Increment(string metric, ActionKey action)
    {
        if (!_transitions.TryGetValue(metric, out var row))
        {
            row = new Dictionary<ActionKey, int>();
            _transitions[metric] = row;
        }
        row[action] = row.GetValueOrDefault(action) + 1;
    }

    private void Decrement(string metric, ActionKey action)
    {
        if (_transitions.TryGetValue(metric, out var row) && row.TryGetValue(action, out var n))
        {
            if (n <= 1)
                row.Remove(action);
            else
                row[action] = n - 1;
        }
    }

    public IReadOnlyList<LearnedTransition> Model()
    {
        lock (_lock)
        {
            return _transitions
                .SelectMany(row =>
                    row.Value.Select(cell => new LearnedTransition(
                        row.Key,
                        cell.Key.Action,
                        cell.Key.Scope,
                        cell.Value
                    ))
                )
                .OrderBy(t => t.Metric)
                .ThenByDescending(t => t.Count)
                .ToList();
        }
    }

    public void Dismiss(DismissRequest request)
    {
        lock (_lock)
        {
            _dismissed.Add($"{request.Id}|{request.TriggerVersion}");
        }
        Rebuild();
    }

    public void Rebuild()
    {
        lock (_rebuildLock)
        {
            RebuildCore();
        }
    }

    private void RebuildCore()
    {
        var now = _clock.Current;
        var devices = _registry.Snapshot().ToDictionary(d => d.DeviceId);
        var active = _alertLog.Active();
        var acknowledged = new HashSet<AlertKey>(_acknowledged.Snapshot());
        var muted = new HashSet<string>(_muted.Snapshot());
        var offlineSince = _disconnects.OfflineSince();
        var alerting = new HashSet<string>(active.Select(a => a.Key.DeviceId));

        var points = devices
            .Values.GroupBy(d => (d.Zone, Math.Round(d.ChainageKm, 2)))
            .ToDictionary(g => g.Key, g => g.ToList());

        Dictionary<string, Dictionary<ActionKey, int>> model;
        HashSet<string> dismissed;
        lock (_lock)
        {
            model = _transitions.ToDictionary(
                r => r.Key,
                r => new Dictionary<ActionKey, int>(r.Value)
            );
            dismissed = new HashSet<string>(_dismissed);
        }

        var candidates = new Dictionary<string, Suggestion>();
        void Add(Suggestion s)
        {
            if (dismissed.Contains($"{s.Id}|{s.TriggerVersion}"))
                return;
            candidates[s.Id] = candidates.TryGetValue(s.Id, out var existing)
                ? Merge(existing, s)
                : s;
        }

        var visibleAlerts = active.Where(a => !muted.Contains(a.Key.DeviceId)).ToList();

        Learned(visibleAlerts, model, devices, points, acknowledged, now, Add);
        Neglected(visibleAlerts, acknowledged, now, Add);
        Drift(devices.Values, alerting, muted, offlineSince, Add);
        CoLocated(visibleAlerts, points, alerting, Add);
        LongOffline(devices, offlineSince, muted, now, Add);
        LowBattery(devices.Values, muted, Add);

        _candidates = candidates.Values.ToList();
    }

    private void Learned(
        List<RaisedAlert> alerts,
        Dictionary<string, Dictionary<ActionKey, int>> model,
        Dictionary<string, DeviceState> devices,
        Dictionary<(string, double), List<DeviceState>> points,
        HashSet<AlertKey> acknowledged,
        long now,
        Action<Suggestion> add
    )
    {
        foreach (var alert in alerts)
        {
            if (!model.TryGetValue(alert.Key.Metric, out var row))
                continue;
            var total = row.Values.Sum();

            foreach (var (action, count) in row)
            {
                if (count < MinSupport)
                    continue;

                CommandTarget target;
                string deviceId;
                switch (action.Scope)
                {
                    case "Subzone":
                        deviceId = alert.Key.DeviceId;
                        target = new CommandTarget(null, alert.Zone, alert.Subzone);
                        break;
                    case "Device":
                        deviceId = alert.Key.DeviceId;
                        target = new CommandTarget(deviceId, null, null);
                        break;
                    default:
                        var neighbour = Neighbour(alert, action.Scope, points);
                        if (neighbour is null)
                            continue;
                        deviceId = neighbour.DeviceId;
                        target = new CommandTarget(deviceId, null, null);
                        break;
                }

                if (AlreadyDone(action.Action, alert, target, devices, acknowledged, now))
                    continue;

                var confidence = (float)count / total;
                add(
                    new Suggestion(
                        $"{action.Action}:{TargetKey(target)}",
                        "Learned",
                        action.Action,
                        action.Action == "Inspect" ? null : target,
                        deviceId,
                        alert.Zone,
                        alert.Subzone,
                        Tier: 0,
                        alert.Severity,
                        confidence,
                        $"{alert.Key.DeviceId}:{alert.Key.Metric}:{alert.RaisedAtBatch}",
                        Breach(alert),
                        ["Learned from user actions"]
                    )
                );
            }
        }
    }

    private static bool AlreadyDone(
        string action,
        RaisedAlert alert,
        CommandTarget target,
        Dictionary<string, DeviceState> devices,
        HashSet<AlertKey> acknowledged,
        long now
    ) =>
        action switch
        {
            "Acknowledge" => acknowledged.Contains(alert.Key),
            "OpenValve" or "CloseValve" => target.DeviceId is { } id
                && devices.TryGetValue(id, out var d)
                && d.Override is { } o
                && o.ValidUntilBatch > now,
            _ => false,
        };

    private static void Neglected(
        List<RaisedAlert> alerts,
        HashSet<AlertKey> acknowledged,
        long now,
        Action<Suggestion> add
    )
    {
        foreach (
            var group in alerts
                .Where(a =>
                    !acknowledged.Contains(a.Key) && now - a.RaisedAtBatch >= NeglectedBatches
                )
                .GroupBy(a => (a.Zone, a.Subzone))
        )
        {
            var worst = group.MaxBy(a => a.Severity)!;
            add(
                new Suggestion(
                    $"Acknowledge:{group.Key.Zone}/{group.Key.Subzone}",
                    "Rule",
                    "Acknowledge",
                    new CommandTarget(null, group.Key.Zone, group.Key.Subzone),
                    worst.Key.DeviceId,
                    group.Key.Zone,
                    group.Key.Subzone,
                    Tier: 0,
                    worst.Severity,
                    0.9f,
                    group.Max(a => a.RaisedAtBatch).ToString(),
                    Breach(worst),
                    ["Neglected alerts"]
                )
            );
        }
    }

    private void Drift(
        IEnumerable<DeviceState> devices,
        HashSet<string> alerting,
        HashSet<string> muted,
        IReadOnlyDictionary<string, long> offlineSince,
        Action<Suggestion> add
    )
    {
        foreach (var d in devices)
        {
            if (
                alerting.Contains(d.DeviceId)
                || muted.Contains(d.DeviceId)
                || offlineSince.ContainsKey(d.DeviceId)
            )
                continue;

            IReadOnlyList<SensorReading> timeline = d.Category switch
            {
                DeviceCategory.Environmental => _environmental.GetTimeline(d.DeviceId),
                DeviceCategory.FlowRate => _flowRate.GetTimeline(d.DeviceId),
                _ => [],
            };
            if (timeline.Count < DriftRecent * 2)
                continue;

            var checks = timeline.Select(r => _thresholds.Evaluate(r)).ToList();

            foreach (var metric in checks[0].Select(c => c.Metric))
            {
                var threshold = _thresholds.ThresholdFor(metric);
                if (threshold is null)
                    continue;

                var values = checks.Select(cs => cs.First(c => c.Metric == metric).Value).ToList();
                var recent = values.TakeLast(DriftRecent).Average();
                var older = values.SkipLast(DriftRecent).Average();
                var gap = MathF.Abs(threshold.Critical - threshold.Normal);
                var lowIsBad = threshold.Critical < threshold.Normal;

                var position =
                    (lowIsBad ? threshold.Normal - recent : recent - threshold.Normal) / gap;
                var moved = (lowIsBad ? older - recent : recent - older) / gap;
                if (position < DriftMinPosition || moved < DriftMinMove)
                    continue;

                add(
                    new Suggestion(
                        $"Inspect:{d.DeviceId}",
                        "Rule",
                        "Inspect",
                        null,
                        d.DeviceId,
                        d.Zone,
                        d.Subzone,
                        Tier: 1,
                        position,
                        0.8f,
                        metric,
                        new SuggestionCause("Drift", metric, recent, d.DeviceId),
                        ["Drift"]
                    )
                );
            }
        }
    }

    private static void CoLocated(
        List<RaisedAlert> alerts,
        Dictionary<(string, double), List<DeviceState>> points,
        HashSet<string> alerting,
        Action<Suggestion> add
    )
    {
        foreach (var alert in alerts)
        {
            if (
                !points.TryGetValue(
                    (alert.Zone, Math.Round(alert.ChainageKm, 2)),
                    out var neighbours
                )
            )
                continue;

            foreach (
                var n in neighbours.Where(n =>
                    n.DeviceId != alert.Key.DeviceId && !alerting.Contains(n.DeviceId)
                )
            )
            {
                add(
                    new Suggestion(
                        $"Inspect:{n.DeviceId}",
                        "Rule",
                        "Inspect",
                        null,
                        n.DeviceId,
                        n.Zone,
                        n.Subzone,
                        Tier: 2,
                        alert.Severity,
                        0.7f,
                        $"{alert.Key.DeviceId}:{alert.Key.Metric}:{alert.RaisedAtBatch}",
                        Breach(alert),
                        ["Co-located device"]
                    )
                );
            }
        }
    }

    private static void LongOffline(
        Dictionary<string, DeviceState> devices,
        IReadOnlyDictionary<string, long> offlineSince,
        HashSet<string> muted,
        long now,
        Action<Suggestion> add
    )
    {
        foreach (var (deviceId, since) in offlineSince)
        {
            var batches = now - since;
            if (
                batches < LongOfflineBatches
                || muted.Contains(deviceId)
                || !devices.TryGetValue(deviceId, out var d)
            )
                continue;

            add(
                new Suggestion(
                    $"Inspect:{deviceId}",
                    "Rule",
                    "Inspect",
                    null,
                    deviceId,
                    d.Zone,
                    d.Subzone,
                    Tier: 3,
                    batches,
                    0.6f,
                    since.ToString(),
                    new SuggestionCause("Offline", null, batches, deviceId),
                    ["Long offline"]
                )
            );
        }
    }

    private void LowBattery(
        IEnumerable<DeviceState> devices,
        HashSet<string> muted,
        Action<Suggestion> add
    )
    {
        foreach (var d in devices)
        {
            if (
                d.BatteryPct is not { } battery
                || battery > _lowBattery
                || muted.Contains(d.DeviceId)
            )
                continue;

            add(
                new Suggestion(
                    $"Inspect:{d.DeviceId}",
                    "Rule",
                    "Inspect",
                    null,
                    d.DeviceId,
                    d.Zone,
                    d.Subzone,
                    Tier: 4,
                    _lowBattery - battery,
                    0.5f,
                    (battery / 5).ToString(),
                    new SuggestionCause("Battery", null, battery, d.DeviceId),
                    ["Low battery"]
                )
            );
        }
    }

    private static DeviceState? Neighbour(
        RaisedAlert alert,
        string category,
        Dictionary<(string, double), List<DeviceState>> points
    ) =>
        points.TryGetValue((alert.Zone, Math.Round(alert.ChainageKm, 2)), out var list)
            ? list.FirstOrDefault(d =>
                d.Category.ToString() == category && d.DeviceId != alert.Key.DeviceId
            )
            : null;

    private static SuggestionCause Breach(RaisedAlert alert) =>
        new("Breach", alert.Key.Metric, alert.Value, alert.Key.DeviceId);

    private static string TargetKey(CommandTarget t) => t.DeviceId ?? $"{t.Zone}/{t.Subzone}";

    private static (int, float, float) Rank(Suggestion s) => (-s.Tier, s.Severity, s.Confidence);

    private static Suggestion Merge(Suggestion a, Suggestion b)
    {
        var better = Rank(a).CompareTo(Rank(b)) >= 0 ? a : b;
        return better with
        {
            Kind = a.Kind == "Learned" || b.Kind == "Learned" ? "Learned" : "Rule",
            Sources = a.Sources.Concat(b.Sources).Distinct().ToList(),
        };
    }

    private static IReadOnlyList<Suggestion> TopK(IEnumerable<Suggestion> candidates, int k)
    {
        var heap = new PriorityQueue<Suggestion, (int, float, float)>();
        foreach (var s in candidates)
        {
            heap.Enqueue(s, Rank(s));
            if (heap.Count > k)
                heap.Dequeue();
        }

        var best = new List<Suggestion>(heap.Count);
        while (heap.TryDequeue(out var s, out _))
            best.Add(s);
        best.Reverse();
        return best;
    }
}
