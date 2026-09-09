using System.Text;
using Microsoft.Extensions.Options;
using MQTTnet;
using backend.Settings;
using backend.Services;
using static backend.Models.Provision.ProvisionData;
using System.Text.Json;
using backend.Models.Provision;
using backend.Models.Readings;
using backend.Models.Telemetry;

namespace backend.BackgroundServices;

public class MqttWorker : BackgroundService
{
    private readonly ILogger<MqttWorker> _logger;
    private readonly IMqttClient _mqttClient;
    private readonly MqttClientOptions _mqttClientOptions;
    private readonly MqttClientSubscribeOptions _mqttSubscribeOptions;
    private readonly MqttSettings _mqttSettings;
    private readonly TelemetryBatcher _telemetryBatcher;
    private readonly DeviceRegistry _deviceRegistry;

    public MqttWorker(ILogger<MqttWorker> logger, IOptions<MqttSettings> mqttSettings, DeviceRegistry deviceRegistry, TelemetryBatcher telemetryBatcher)
    {

        _deviceRegistry = deviceRegistry;
        _logger = logger;
        _mqttSettings = mqttSettings.Value;
        _telemetryBatcher = telemetryBatcher;

        string broker = _mqttSettings.MqttHost;
        int port = _mqttSettings.MqttPort;
        string clientId = "dev_test";
        string provisionTopic = "devices/provision";
        string telemetryTopic = "sensors/telemetry";

        // Setup for the client.
        var mqttFactory = new MqttClientFactory();
        _mqttClient = mqttFactory.CreateMqttClient();
        _mqttClientOptions = new MqttClientOptionsBuilder()
            .WithClientId(clientId)
            .WithTcpServer(broker, port)
            .WithCleanSession(false)
            .Build();

        _mqttSubscribeOptions = mqttFactory.CreateSubscribeOptionsBuilder()
            .WithTopicFilter(t => t.WithTopic(provisionTopic))
            .WithTopicFilter(t => t.WithTopic(telemetryTopic))
            .Build();

        HandleMqttEvent();
    }

    public void HandleMqttEvent()
    {
        // Handle incoming message.
        _mqttClient.ApplicationMessageReceivedAsync += e =>
        {
            var topic = e.ApplicationMessage.Topic;
            var message = Encoding.UTF8.GetString(e.ApplicationMessage.Payload);

            if (topic == "devices/provision")
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
                        _logger.LogWarning($"Failed to deserialise {message} from topic {topic}.");
                    }

                }
                catch (Exception ex)
                {
                    _logger.LogError($"Something went wrong: {ex}");
                }
                
            }
            else if (topic == "sensors/telemetry")
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
                                List<TelemetryPacket> envPackets = environmentalReading.ToPackets();
                                _telemetryBatcher.AddPackets(envPackets);
                            }
                            else
                            {
                                _logger.LogWarning($"Failed to deserialise {message} from topic {topic}.");
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
                                _logger.LogWarning($"Failed to deserialise {message} from topic {topic}.");
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
                                _logger.LogWarning($"Failed to deserialise {message} from topic {topic}.");
                            }
                        }
                    }
                }
                else
                {
                    _logger.LogWarning($"Failed to find device id, possibly malformed message");
                }
            }

            // This will flood your terminal.
            //_logger.LogInformation("Recieved message for {Topic} with content {Message}.", topic, message);

            return Task.CompletedTask;
        };
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Recommened connect/reconnect approach using polling, recommended by MqttNet.
            try
            {
                if (!await _mqttClient.TryPingAsync())
                {
                    var connectResult = await _mqttClient.ConnectAsync(_mqttClientOptions, stoppingToken);

                    if (connectResult.ResultCode == MqttClientConnectResultCode.Success)
                    {
                        _logger.LogInformation("Successfully connected to MQTT broker.");

                        // Check if a session exists, if it doesnt subscribe to the topics.
                        if (connectResult.IsSessionPresent)
                        {
                            _logger.LogInformation("Session was found, queued messages and subscription were preserved.");
                        }
                        else
                        {
                            await _mqttClient.SubscribeAsync(_mqttSubscribeOptions, stoppingToken);

                            _logger.LogInformation("No session was found, subscribed to topics.");
                        }
                    }
                    else
                    {
                        _logger.LogInformation("Failed to connect to MQTT broker.");
                    }
                }
                // Ping the server again after 5 seconds to check for disconnects.
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Service cancled by user.");
            }
            catch
            {
                _logger.LogError("An error occured while trying to connect to the MQTT broker.");
                try
                {
                    // On failure ping the server again after 5 secconds to prevent hammering the broker.
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Service cancled by user.");
                }
                
            }
        }  
    }

    public override async Task StopAsync(CancellationToken stoppingToken) 
    {
        // Disconnect cleanly.
        if (_mqttClient.IsConnected)
        {
            await _mqttClient.DisconnectAsync(MqttClientDisconnectOptionsReason.NormalDisconnection);
        }
        await base.StopAsync(stoppingToken);
        _mqttClient.Dispose();

    }

}
