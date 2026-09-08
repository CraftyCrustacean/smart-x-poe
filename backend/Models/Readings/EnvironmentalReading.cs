using backend.Models.Telemetry;
using System;
using System.Text.Json.Serialization;

namespace backend.Models.Readings;

public class EnvironmentalReading
{
    [JsonPropertyName("device_id")]
    public required string DeviceId { get; set; }
    [JsonPropertyName("timestamp")]
    public required DateTime TimeStamp { get; set; }
    [JsonPropertyName("elevation_change_mm")]
    public required float ElevationChange { get; set; }
    [JsonPropertyName("surface_temperature_c")]
    public required float SurfaceTemp { get; set; }
    [JsonPropertyName("colour_shift_index")]
    public required float ColourShift { get; set; }
    [JsonPropertyName("battery_level_pct")]
    public required int BatteryLevel { get; set; }

    public List<TelemetryPacket> ToPackets()
    {
        List<TelemetryPacket> allEnvironmentalPackets = new();

        allEnvironmentalPackets.Add(new TelemetryPacket<float>
        {
            DeviceId = this.DeviceId,
            TimeStamp = this.TimeStamp,
            MetricName = "elevation_change_mm",
            Value = this.ElevationChange
        });

        allEnvironmentalPackets.Add(new TelemetryPacket<float>
        {
            DeviceId = this.DeviceId,
            TimeStamp = this.TimeStamp,
            MetricName = "surface_temperature_c",
            Value = this.SurfaceTemp
        });

        allEnvironmentalPackets.Add(new TelemetryPacket<float>
        {
            DeviceId = this.DeviceId,
            TimeStamp = this.TimeStamp,
            MetricName = "colour_shift_index",
            Value = this.ColourShift
        });

        allEnvironmentalPackets.Add(new TelemetryPacket<int>
        {
            DeviceId = this.DeviceId,
            TimeStamp = this.TimeStamp,
            MetricName = "battery_level_pct",
            Value = this.BatteryLevel
        });

        return allEnvironmentalPackets;
    }

}
