using System.Text;
using Microsoft.Extensions.Options;
using MQTTnet;
using MQTTnet.Packets;
using MQTTnet.Protocol;
using smart_x_poe.backend.Settings;

namespace smart_x_poe.backend.BackgroundServices;

public class MqttWorker : BackgroundService
{
    private readonly ILogger<MqttWorker> _logger;
    private readonly IMqttClient _mqttClient;
    private readonly MqttClientOptions _mqttClientOptions;
    private readonly MqttClientSubscribeOptions _mqttSubscribeOptions;
    private readonly MqttSettings _mqttSettings;

    public MqttWorker(ILogger<MqttWorker> logger, IOptions<MqttSettings> mqttSettings)
    {

        _logger = logger;
        _mqttSettings = mqttSettings.Value;

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
