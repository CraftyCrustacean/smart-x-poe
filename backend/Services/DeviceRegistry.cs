using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using static backend.Models.Provision.ProvisionData;

namespace backend.Services;

public class DeviceRegistry
{

    private ConcurrentDictionary<string, DeviceCategory> _deviceCategory = new();

    public bool RegisterDevice(string id, DeviceCategory category)
    {

        return _deviceCategory.TryAdd(id, category);

    }

    public bool GetDeviceCategory(string id, [NotNullWhen(true)] out DeviceCategory category)
    {

        return _deviceCategory.TryGetValue(id, out category);

    }

}
