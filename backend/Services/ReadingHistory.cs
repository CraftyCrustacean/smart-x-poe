using backend.Models.Readings;

namespace backend.Services;

public sealed class ReadingHistory<TReading>
    where TReading : SensorReading
{
    public const int Capacity = 30;

    private readonly Dictionary<string, SortedDictionary<DateTime, TReading>> _byDevice = [];
    private readonly Lock _lock = new();

    public void Add(TReading reading)
    {
        lock (_lock)
        {
            if (!_byDevice.TryGetValue(reading.DeviceId, out var timeline))
            {
                timeline = new SortedDictionary<DateTime, TReading>();
                _byDevice[reading.DeviceId] = timeline;
            }

            timeline[reading.TimeStamp] = reading;

            if (timeline.Count > Capacity)
            {
                timeline.Remove(timeline.Keys.First());
            }
        }
    }

    public IReadOnlyList<TReading> GetTimeline(string deviceId)
    {
        lock (_lock)
        {
            return _byDevice.TryGetValue(deviceId, out var timeline)
                ? timeline.Values.ToList()
                : [];
        }
    }
}
