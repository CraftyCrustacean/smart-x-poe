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

    public static FlowRateAggregate operator + (FlowRateReading firstReading, FlowRateReading secondReading)
    {
        return new FlowRateAggregate
        {

            FlowRateTotal = firstReading.FlowRate + secondReading.FlowRate,
            TimeStamp = firstReading.TimeStamp,

        };
    }

}

public class FlowRateAggregate
{
    public string? LocationId { get; set;}
    public required DateTime TimeStamp { get; set;}
    public required float FlowRateTotal { get; set; }

    public static FlowRateTotal operator +(FlowRateAggregate firstAggregate, FlowRateAggregate secondAggregate)
    {
        var t = firstAggregate.TimeStamp;
        var t1 = secondAggregate.TimeStamp;

        t = new DateTime(t.Year, t.Month, t.Day, t.Hour, 0, 0, t.Kind);
        t1 = new DateTime(t1.Year, t1.Month, t1.Day, t1.Hour, 0, 0, t1.Kind);

        if (t != t1) { throw new ArgumentException($"Cannot aggregate flow rates across different batches."); }
        return new FlowRateTotal
        {

            TimeStamp = t1,
            FinalTotal = firstAggregate.FlowRateTotal + secondAggregate.FlowRateTotal
        };
    }

}

public class FlowRateTotal
{
    public string? LocationId { get; set; }
    public required DateTime TimeStamp { get; set; }
    public required float FinalTotal { get; set; }
}