using System.Text.Json;
using backend.Models.Live;
using backend.Models.Provision;
using backend.Models.Readings;
using backend.Models.State;
using backend.Models.Telemetry;
using backend.Services.History;
using backend.Services.Persistence;
using backend.Services.State;
using static backend.Models.Provision.ProvisionData;

namespace backend.Services.Telemetry;

public class TelemetryProcessor
{
    private readonly ILogger<TelemetryProcessor> _logger;
    private readonly TelemetryBatcher _telemetryBatcher;
    private readonly EnvironmentalHistory _environmentalHistory;
    private readonly FlowRateHistory _flowRateHistory;
    private readonly DeviceRegistry _deviceRegistry;
    private readonly DeviceStore _deviceStore;
    private readonly TelemetryQueue _telemetryQueue;
    private readonly ReadingHistory<EnvironmentalReading> _environmentalTimeline;
    private readonly ReadingHistory<ActuatorReading> _actuatorTimeline;
    private readonly ReadingHistory<FlowRateReading> _flowRateTimeline;
    private readonly ThresholdEvaluator _thresholdEvaluator;
    private readonly ActiveAlerts _activeAlerts;
    private readonly LiveUpdates _liveUpdates;

    public TelemetryProcessor(
        ILogger<TelemetryProcessor> logger,
        DeviceRegistry deviceRegistry,
        TelemetryBatcher telemetryBatcher,
        EnvironmentalHistory environmentalHistory,
        DeviceStore deviceStore,
        FlowRateHistory flowRateHistory,
        TelemetryQueue telemetryQueue,
        ReadingHistory<EnvironmentalReading> environmentalTimeline,
        ReadingHistory<ActuatorReading> actuatorTimeline,
        ReadingHistory<FlowRateReading> flowRateTimeline,
        ThresholdEvaluator thresholdEvaluator,
        ActiveAlerts activeAlerts,
        LiveUpdates liveUpdates
    )
    {
        _flowRateHistory = flowRateHistory;
        _environmentalHistory = environmentalHistory;
        _deviceRegistry = deviceRegistry;
        _logger = logger;
        _telemetryBatcher = telemetryBatcher;
        _deviceStore = deviceStore;
        _telemetryQueue = telemetryQueue;
        _environmentalTimeline = environmentalTimeline;
        _actuatorTimeline = actuatorTimeline;
        _flowRateTimeline = flowRateTimeline;
        _thresholdEvaluator = thresholdEvaluator;
        _activeAlerts = activeAlerts;
        _liveUpdates = liveUpdates;
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

    public void Ingest(string message)
    {
        var receivedAtUtc = DateTime.UtcNow;

        try
        {
            using var document = JsonDocument.Parse(message);

            if (
                !document.RootElement.TryGetProperty("device_id", out var idElement)
                || idElement.ValueKind != JsonValueKind.String
            )
            {
                _logger.LogWarning("Telemetry without a device_id string dropped.");
                return;
            }

            var deviceId = idElement.GetString()!;

            if (!_deviceRegistry.TryGet(deviceId, out var state))
            {
                _logger.LogWarning("Unknown device {DeviceId}; telemetry dropped.", deviceId);
                return;
            }

            SensorReading? reading = state.Category switch
            {
                DeviceCategory.Environmental => JsonSerializer.Deserialize<EnvironmentalReading>(
                    document
                ),
                DeviceCategory.Actuator => JsonSerializer.Deserialize<ActuatorReading>(document),
                DeviceCategory.FlowRate => JsonSerializer.Deserialize<FlowRateReading>(document),
                _ => null,
            };

            if (reading is null)
            {
                _logger.LogWarning(
                    "Telemetry for {DeviceId} could not be read as {Category}.",
                    deviceId,
                    state.Category
                );
                return;
            }

            _telemetryQueue.Enqueue(reading, receivedAtUtc, _thresholdEvaluator.Evaluate(reading));
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Malformed telemetry message dropped.");
        }
    }

    public void Process(QueuedTelemetry item)
    {
        var reading = item.Reading;
        var result = _deviceRegistry.RecordTelemetry(
            reading.DeviceId,
            item.ReceivedAtUtc,
            reading.BatteryLevel
        );

        if (result == TelemetryUpdateResult.UnknownDevice)
        {
            return;
        }

        var isLatest = result == TelemetryUpdateResult.Applied;

        switch (reading)
        {
            case EnvironmentalReading environmental:
                _environmentalTimeline.Add(environmental);
                break;
            case ActuatorReading actuator:
                _actuatorTimeline.Add(actuator);
                break;
            case FlowRateReading flowRate:
                _flowRateTimeline.Add(flowRate);
                break;
        }

        if (isLatest)
        {
            foreach (var check in item.Checks)
            {
                var key = new AlertKey(reading.DeviceId, check.Metric);

                if (check.IsBreach)
                {
                    if (_activeAlerts.TryAdd(key))
                    {
                        _logger.LogWarning(
                            "Critical alert raised: {DeviceId} {Metric} = {Value} (severity {Severity:F2}).",
                            reading.DeviceId,
                            check.Metric,
                            check.Value,
                            check.Severity
                        );

                        if (_deviceRegistry.TryGet(reading.DeviceId, out var device))
                        {
                            _liveUpdates.AlertRaised(
                                new AlertEvent(
                                    reading.DeviceId,
                                    device.Zone,
                                    device.Subzone,
                                    check.Metric,
                                    check.Value,
                                    check.Severity,
                                    reading.TimeStamp,
                                    DateTime.UtcNow
                                )
                            );
                        }
                    }
                }
                else if (_activeAlerts.Remove(key))
                {
                    _logger.LogInformation(
                        "Alert cleared: {DeviceId} {Metric}.",
                        reading.DeviceId,
                        check.Metric
                    );
                }
            }
        }

        switch (reading)
        {
            case EnvironmentalReading environmental when isLatest:
                if (
                    _environmentalHistory.TryGetPrevious(environmental.DeviceId, out var previous)
                    && previous != null
                )
                {
                    _ = previous - environmental;
                }
                _environmentalHistory.UpdateLatest(environmental.DeviceId, environmental);
                break;

            case FlowRateReading flowRate when isLatest:
                _flowRateHistory.UpdateLatest(flowRate.DeviceId, flowRate);
                break;
        }

        _telemetryBatcher.AddPackets(reading.ToPackets());
    }
}
