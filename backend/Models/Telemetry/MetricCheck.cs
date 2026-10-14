namespace backend.Models.Telemetry;

public readonly record struct MetricCheck(string Metric, float Value, float Severity)
{
    public bool IsBreach => Severity > 0;
}
