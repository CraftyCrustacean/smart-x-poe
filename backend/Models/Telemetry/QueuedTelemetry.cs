using backend.Models.Readings;

namespace backend.Models.Telemetry;

public sealed record QueuedTelemetry(
    SensorReading Reading,
    DateTime ReceivedAtUtc,
    long Sequence,
    IReadOnlyList<MetricCheck> Checks
)
{
    public float Severity { get; } = Checks.Count == 0 ? 0f : Checks.Max(c => c.Severity);

    public bool IsCritical => Severity > 0;
}
