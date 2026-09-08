using backend.Models.Telemetry;
using System.Text.Json.Serialization;

namespace backend.Models.Readings;

public class ActuatorReading
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; set; }
    [JsonPropertyName("timestamp")]
    public required DateTime TimeStamp { get; set; }
    [JsonPropertyName("valve_open")]
    public required bool ValveOpen { get; set; }
    [JsonPropertyName("battery_level_pct")]
    public required int BatteryLevel { get; set; }

    public List<TelemetryPacket> ToPackets()
    {
        List<TelemetryPacket> allActuatorPackets = new();

        allActuatorPackets.Add(new TelemetryPacket<bool>
        {
            DeviceId = this.DeviceId,
            TimeStamp = this.TimeStamp,
            MetricName = "valve_open",
            Value = this.ValveOpen
        });

        allActuatorPackets.Add(new TelemetryPacket<int>
        {
            DeviceId = this.DeviceId,
            TimeStamp = this.TimeStamp,
            MetricName = "battery_level_pct",
            Value = this.BatteryLevel
        });

        return allActuatorPackets;
    }

}
