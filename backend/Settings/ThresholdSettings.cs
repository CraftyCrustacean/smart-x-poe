namespace backend.Settings;

public class MetricThreshold
{
    public float Normal { get; set; }
    public float Critical { get; set; }

    public float Severity(float value)
    {
        var scale = MathF.Abs(Critical - Normal);
        var excess = Critical < Normal ? Critical - value : value - Critical;
        return excess > 0 ? excess / scale : 0f;
    }
}

public class ThresholdSettings
{
    public const string ThresholdSettingsName = "Thresholds";

    public MetricThreshold ElevationChangeMm { get; set; } = new();
    public MetricThreshold SurfaceTemperatureC { get; set; } = new();
    public MetricThreshold ColourShiftIndex { get; set; } = new();
    public MetricThreshold FlowRateLps { get; set; } = new();
}
