using backend.Models.Provision;
using backend.Models.Readings;
using backend.Models.Telemetry;
using System.Text.Json;
using static backend.Models.Provision.ProvisionData;

namespace backend.Services;

public class TelemetryProcessor
{
    private readonly ILogger<TelemetryProcessor> _logger;
    private readonly TelemetryBatcher _telemetryBatcher;
    private readonly EnvironmentalHistory _environmentalHistory;
    private readonly DeviceRegistry _deviceRegistry;

    public TelemetryProcessor(ILogger<TelemetryProcessor> logger, DeviceRegistry deviceRegistry, TelemetryBatcher telemetryBatcher, EnvironmentalHistory environmentalHistory) 
    {

        _environmentalHistory = environmentalHistory;
        _deviceRegistry = deviceRegistry;
        _logger = logger;
        _telemetryBatcher = telemetryBatcher;
    }

    public void ProcessProvisioning(string message)
    {

        try
        {
            ProvisionData? provisionData = JsonSerializer.Deserialize<ProvisionData>(message);

            if (provisionData != null)
            {
                _deviceRegistry.RegisterDevice(provisionData.DeviceId, provisionData.Category);
            }
            else
            {
                _logger.LogWarning($"Failed to deserialise {message} from topic: provision.");
            }

        }
        catch (Exception ex)
        {
            _logger.LogError($"Something went wrong: {ex}");
        }

    }

    public void ProcessTelemetry(string message)
    {

        using var jsonDocument = JsonDocument.Parse(message);
        var rootElement = jsonDocument.RootElement;
        var deviceIdJsonElement = rootElement.GetProperty("device_id");
        var deviceId = deviceIdJsonElement.GetString();
        DeviceCategory category;

        if (deviceId != null)
        {
            if (!_deviceRegistry.GetDeviceCategory(deviceId, out category))
            {
                _logger.LogWarning($"Failed to find category for device with id: {deviceId}. Unknown Category.");
            }
            else
            {
                if (category == DeviceCategory.Environmental)
                {
                    // Warning repition could use some clean up if time allows.
                    EnvironmentalReading? environmentalReading = JsonSerializer.Deserialize<EnvironmentalReading>(message);
                    if (environmentalReading != null)
                    {
                        EnvironmentalReading? previousReading;

                        if (_environmentalHistory.TryGetPrevious(deviceId, out previousReading))
                        {

                            var deltaResult = previousReading - environmentalReading;
                            // This will flood the terminal
                            //_logger.LogInformation($"Operator overloading performed, sample output - DeviceId: {deltaResult.DeviceId} ele change: {deltaResult.RateOfElevationChange}");
                        }

                        _environmentalHistory.UpdateLatest(deviceId, environmentalReading);
                        List<TelemetryPacket> envPackets = environmentalReading.ToPackets();
                        _telemetryBatcher.AddPackets(envPackets);
                    }
                    else
                    {
                        _logger.LogWarning($"Failed to deserialise {message} from topic: telmetry.");
                    }
                }
                else if (category == DeviceCategory.Actuator)
                {
                    ActuatorReading? actuatorReading = JsonSerializer.Deserialize<ActuatorReading>(message);
                    if (actuatorReading != null)
                    {
                        List<TelemetryPacket> actPackets = actuatorReading.ToPackets();
                        _telemetryBatcher.AddPackets(actPackets);
                    }
                    else
                    {
                        _logger.LogWarning($"Failed to deserialise {message} from topic: telmetry.");
                    }
                }
                else if (category == DeviceCategory.FlowRate)
                {
                    FlowRateReading? flowRateReading = JsonSerializer.Deserialize<FlowRateReading>(message);
                    if (flowRateReading != null)
                    {
                        List<TelemetryPacket> flowPackets = flowRateReading.ToPackets();
                        _telemetryBatcher.AddPackets(flowPackets);
                    }
                    else
                    {
                        _logger.LogWarning($"Failed to deserialise {message} from topic: telmetry.");
                    }
                }
            }
        }
        else
        {
            _logger.LogWarning($"Failed to find device id, possibly malformed message");
        }

    }

}

