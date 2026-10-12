using backend.Models.Telemetry;
using System.Text.Json.Serialization;

namespace backend.Models.Readings;

public abstract class SensorReading
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; set; }

    [JsonPropertyName("timestamp")]
    public required DateTime TimeStamp { get; set; }

    [JsonPropertyName("battery_level_pct")]
    public required int BatteryLevel { get; set; }

    public abstract List<TelemetryPacket> ToPackets();
}
