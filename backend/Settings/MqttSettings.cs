namespace backend.Settings;

public class MqttSettings
{
	public const string MqttSettingsName = "MqttSettings";
	public required string MqttHost { get; set; }
	public required int MqttPort { get; set; }
}
