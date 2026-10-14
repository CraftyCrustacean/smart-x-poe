using System.Diagnostics.CodeAnalysis;
using backend.Models.Readings;

namespace backend.Services.History;

public class FlowRateHistory
{
    private readonly Dictionary<string, FlowRateReading> _currentFlowRateReading = new();
    private readonly Lock _lock = new();

    public bool TryGetPrevious(string deviceId, [NotNullWhen(true)] out FlowRateReading? previous)
    {
        lock (_lock)
        {
            return _currentFlowRateReading.TryGetValue(deviceId, out previous);
        }
    }

    public void UpdateLatest(string deviceId, FlowRateReading reading)
    {
        lock (_lock)
        {
            _currentFlowRateReading[deviceId] = reading;
        }
    }
}
