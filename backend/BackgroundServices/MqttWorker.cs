using MQTTnet.Packets;
using MQTTnet.Protocol;
using MQTTnet.Samples.Helpers;

namespace smart_x_poe.backend.BackgroundServices;
public static class Subscribe_Client
{
    public static async Task Subscribe_Multiple_Topics()
    {
        var mqttFactory = MqttClientFactory();
        using var mqttClient = new mqttFactor.CreateMqttClient();
        var mqttClientOptions = new MqttClientOptionsBuilder().WithTcpServer("mosquitto", 1883).build();

        await mqttClient.ConnectAsync(mqttClientOptions, CancellationToken.None);

        var mqttSubscribeOptions = mqttFactory.CreateSubscribeOptionsBuilder()
            .WithTopicFilter(t = t.WithTopic("devices/provision"))
            .WithTopicFilter(t = t.WithTopic("sensors/telemetry"))
            .WithTopicFilter(t => t.WithRetainHandling(MqttRetainHandling.SendAtSubscribe))
            .WithCleanSession(true)
            .Build();

        var response = await mqttClient.SubscribeAsync(mqttSubscribeOptions, CancellationToken.None);

        Console.WriteLine("MQTT client subscribed to topics.");
        
        response.DumpToConsole();
    }
}