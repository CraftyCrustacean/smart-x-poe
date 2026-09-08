using backend.Models.Telemetry;
using System.Text.Json.Serialization;

namespace backend.Models.Readings;

public class FlowRateReading
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; set; }
    [JsonPropertyName("timestamp")]
    public required DateTime TimeStamp { get; set; }
    [JsonPropertyName("flow_rate_lps")]
    public required float FlowRate { get; set; }
    [JsonPropertyName("battery_level_pct")]
    public required int BatteryLevel { get; set; }

    public List<TelemetryPacket> ToPackets()
    {
        List<TelemetryPacket> allFlowRatePackets = new();

        allFlowRatePackets.Add(new TelemetryPacket<float>
        {
            DeviceId = this.DeviceId,
            TimeStamp = this.TimeStamp,
            MetricName = "flow_rate_lps",
            Value = this.FlowRate
        });

        allFlowRatePackets.Add(new TelemetryPacket<int>
        {
            DeviceId = this.DeviceId,
            TimeStamp = this.TimeStamp,
            MetricName = "battery_level_pct",
            Value = this.BatteryLevel
        });

        return allFlowRatePackets;
    }
}
