using System.Text.Json.Serialization;
using backend.Models.Telemetry;

namespace backend.Models.Readings;

public class ActuatorReading : SensorReading
{
    [JsonPropertyName("valve_open")]
    public required bool ValveOpen { get; set; }

    public override List<TelemetryPacket> ToPackets()
    {
        List<TelemetryPacket> allActuatorPackets = new();

        allActuatorPackets.Add(
            new TelemetryPacket<bool>
            {
                DeviceId = this.DeviceId,
                TimeStamp = this.TimeStamp,
                MetricName = "valve_open",
                Value = this.ValveOpen,
            }
        );

        allActuatorPackets.Add(
            new TelemetryPacket<int>
            {
                DeviceId = this.DeviceId,
                TimeStamp = this.TimeStamp,
                MetricName = "battery_level_pct",
                Value = this.BatteryLevel,
            }
        );

        return allActuatorPackets;
    }
}
