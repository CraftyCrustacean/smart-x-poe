using backend.Models.Readings;

namespace backend.Models.Telemetry;

public sealed record QueuedTelemetry(SensorReading Reading, DateTime ReceivedAtUtc, long Sequence);
