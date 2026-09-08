namespace backend.Models.Telemetry;

public class TelemetryPacket
{
    public required string DeviceId { get; set; }
    public required DateTime TimeStamp { get; set; }
    public required string MetricName { get; set; }

}

public class TelemetryPacket<T> : TelemetryPacket
{
    public required T Value { get; set; }
}
