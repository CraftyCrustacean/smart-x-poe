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
    private readonly FlowRateHistory _flowRateHistory;
    private readonly DeviceRegistry _deviceRegistry;
    private readonly DeviceStore _deviceStore;

    public TelemetryProcessor(ILogger<TelemetryProcessor> logger, DeviceRegistry deviceRegistry, TelemetryBatcher telemetryBatcher, EnvironmentalHistory environmentalHistory, DeviceStore deviceStore, FlowRateHistory flowRateHistory) 
    {
        _flowRateHistory = flowRateHistory;
        _environmentalHistory = environmentalHistory;
        _deviceRegistry = deviceRegistry;
        _logger = logger;
        _telemetryBatcher = telemetryBatcher;
        _deviceStore = deviceStore;
    }

    public async Task ProcessProvisioning(string message)
    {

        try
        {
            ProvisionData? provisionData = JsonSerializer.Deserialize<ProvisionData>(message);
            if (provisionData != null)
            {
                await _deviceStore.UpsertDevice(provisionData);
                _deviceRegistry.Register(provisionData);
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

        if (deviceId != null)
        {
            if (!_deviceRegistry.TryGet(deviceId, out var state))
            {
                _logger.LogWarning($"Unknown device {deviceId} - telemetry dropped.");
            }
            else
            {
                var receivedAtUtc = DateTime.UtcNow;
                var category = state.Category;

                if (category == DeviceCategory.Environmental)
                {
                    // Warning repition could use some clean up if time allows.
                    EnvironmentalReading? environmentalReading = JsonSerializer.Deserialize<EnvironmentalReading>(message);
                    if (environmentalReading != null)
                    {
                        EnvironmentalReading? previousReading;

                        if (_environmentalHistory.TryGetPrevious(deviceId, out previousReading) && previousReading != null)
                        {

                            var deltaResult = previousReading - environmentalReading;
                            // This will flood the terminal
                            //_logger.LogInformation($"Operator overloading performed, sample output - DeviceId: {deltaResult.DeviceId} ele change: {deltaResult.RateOfElevationChange}");
                        }

                        _deviceRegistry.RecordTelemetry(deviceId, receivedAtUtc, environmentalReading.BatteryLevel);
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
                        _deviceRegistry.RecordTelemetry(deviceId, receivedAtUtc, actuatorReading.BatteryLevel);
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
                        _deviceRegistry.RecordTelemetry(deviceId, receivedAtUtc, flowRateReading.BatteryLevel);
                        List<TelemetryPacket> flowPackets = flowRateReading.ToPackets();
                        _telemetryBatcher.AddPackets(flowPackets);
                        _flowRateHistory.UpdateLatest(deviceId, flowRateReading);
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

