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
                Check("elevation_change_mm", e.ElevationChange),
                Check("surface_temperature_c", e.SurfaceTemp),
                Check("colour_shift_index", e.ColourShift),
            },
            FlowRateReading f => new[] { Check("flow_rate_lps", f.FlowRate) },
            _ => Array.Empty<MetricCheck>(),
        };

    public float SeverityFor(string metric, float value) =>
        metric switch
        {
            "elevation_change_mm" => _thresholds.ElevationChangeMm.Severity(value),
            "surface_temperature_c" => _thresholds.SurfaceTemperatureC.Severity(value),
            "colour_shift_index" => _thresholds.ColourShiftIndex.Severity(value),
            "flow_rate_lps" => _thresholds.FlowRateLps.Severity(value),
            _ => 0f,
        };

    private MetricCheck Check(string metric, float value) =>
        new(metric, value, SeverityFor(metric, value));
}
