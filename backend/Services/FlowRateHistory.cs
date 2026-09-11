using backend.Models.Readings;

namespace backend.Services;

public class FlowRateHistory
{

    private Dictionary<string, FlowRateReading> _currentFlowRateReading = new();

    public bool TryGetPrevious(string deviceId, out FlowRateReading? previous)
    {
        return _currentFlowRateReading.TryGetValue(deviceId, out previous);
    }

    public void UpdateLatest(string deviceId, FlowRateReading reading)
    {
        _currentFlowRateReading[deviceId] = reading;
    }

}

