using backend.Models.Readings;
using backend.Models.Telemetry;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Services;

public sealed class ThresholdEvaluator
{
    private readonly ThresholdSettings _thresholds;

    public ThresholdEvaluator(IOptions<ThresholdSettings> options)
    {
        _thresholds = options.Value;
    }

    public IReadOnlyList<MetricCheck> Evaluate(SensorReading reading) =>
        reading switch
        {
            EnvironmentalReading e => new[]
            {
                Check("elevation_change_mm", e.ElevationChange, _thresholds.ElevationChangeMm),
                Check("surface_temperature_c", e.SurfaceTemp, _thresholds.SurfaceTemperatureC),
                Check("colour_shift_index", e.ColourShift, _thresholds.ColourShiftIndex),
            },
            FlowRateReading f => new[]
            {
                Check("flow_rate_lps", f.FlowRate, _thresholds.FlowRateLps),
            },
            _ => Array.Empty<MetricCheck>(),
        };

    private static MetricCheck Check(string metric, float value, MetricThreshold threshold) =>
        new(metric, value, threshold.Severity(value));
}
