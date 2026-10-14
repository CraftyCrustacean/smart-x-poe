using backend.Models.Snapshots;
using backend.Models.Telemetry;

namespace backend.Services;

public sealed class SnapshotBuilder
{
    private readonly DeviceRegistry _registry;
    private readonly ThresholdEvaluator _thresholds;
    private readonly SnapshotStore _store;

    public SnapshotBuilder(
        DeviceRegistry registry,
        ThresholdEvaluator thresholds,
        SnapshotStore store
    )
    {
        _registry = registry;
        _thresholds = thresholds;
        _store = store;
    }

    public int Build(TelemetryBatch batch)
    {
        var accumulators = new Dictionary<(ScopeKey Scope, string Metric), Accumulator>();

        foreach (var packet in batch.Packets)
        {
            if (!_registry.TryGet(packet.DeviceId, out var device))
            {
                continue;
            }

            float value;
            switch (packet)
            {
                case TelemetryPacket<float> f:
                    value = f.Value;
                    break;
                case TelemetryPacket<int> i:
                    value = i.Value;
                    break;
                default:
                    continue;
            }

            var breaching = _thresholds.SeverityFor(packet.MetricName, value) > 0;

            Accumulate(
                accumulators,
                new ScopeKey(device.Zone, null),
                packet.MetricName,
                value,
                breaching
            );
            Accumulate(
                accumulators,
                new ScopeKey(device.Zone, device.Subzone),
                packet.MetricName,
                value,
                breaching
            );
        }

        var snapshots = accumulators
            .GroupBy(entry => entry.Key.Scope)
            .ToDictionary(
                scopeGroup => scopeGroup.Key,
                scopeGroup => new ScopeSnapshot(
                    batch.Timestamp,
                    scopeGroup.ToDictionary(e => e.Key.Metric, e => e.Value.ToSummary())
                )
            );

        _store.AddBatch(snapshots);
        return snapshots.Count;
    }

    private static void Accumulate(
        Dictionary<(ScopeKey Scope, string Metric), Accumulator> accumulators,
        ScopeKey scope,
        string metric,
        float value,
        bool breaching
    )
    {
        if (!accumulators.TryGetValue((scope, metric), out var accumulator))
        {
            accumulator = new Accumulator();
            accumulators[(scope, metric)] = accumulator;
        }

        accumulator.Add(value, breaching);
    }

    private sealed class Accumulator
    {
        private int _count;
        private double _sum;
        private float _min = float.MaxValue;
        private float _max = float.MinValue;
        private int _breaching;

        public void Add(float value, bool breaching)
        {
            _count++;
            _sum += value;
            if (value < _min)
                _min = value;
            if (value > _max)
                _max = value;
            if (breaching)
                _breaching++;
        }

        public MetricSummary ToSummary() =>
            new(_count, _min, _max, (float)(_sum / _count), _breaching);
    }
}
