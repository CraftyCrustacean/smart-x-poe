using System.Diagnostics.CodeAnalysis;
using backend.Models.Readings;

namespace backend.Services.History;

public class EnvironmentalHistory
{
    private readonly Dictionary<string, EnvironmentalReading> _previousEnvironmentalReading = new();
    private readonly Lock _lock = new();

    public bool TryGetPrevious(
        string deviceId,
        [NotNullWhen(true)] out EnvironmentalReading? previous
    )
    {
        lock (_lock)
        {
            return _previousEnvironmentalReading.TryGetValue(deviceId, out previous);
        }
    }

    public void UpdateLatest(string deviceId, EnvironmentalReading reading)
    {
        lock (_lock)
        {
            _previousEnvironmentalReading[deviceId] = reading;
        }
    }
}
