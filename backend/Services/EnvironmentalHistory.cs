using backend.Models.Readings;

namespace backend.Services;

public class EnvironmentalHistory
{

    private Dictionary<string, EnvironmentalReading> _previousEnvironmentalReading = new();

    public bool TryGetPrevious(string deviceId, out EnvironmentalReading? previous)
    {
        return _previousEnvironmentalReading.TryGetValue(deviceId, out previous);
    }

    public void UpdateLatest(string deviceId, EnvironmentalReading reading)
    {
        _previousEnvironmentalReading[deviceId] = reading;
    }

}

