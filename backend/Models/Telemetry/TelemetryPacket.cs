using System.Text.Json.Serialization;

namespace backend.Models.Telemetry;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "valueType")]
[JsonDerivedType(typeof(TelemetryPacket<float>), "float")]
[JsonDerivedType(typeof(TelemetryPacket<int>), "int")]
[JsonDerivedType(typeof(TelemetryPacket<bool>), "bool")]
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
