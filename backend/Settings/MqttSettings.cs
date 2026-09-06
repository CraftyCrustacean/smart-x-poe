using System;

namespace smart_x_poe.backend.Settings;

public class MqttSettings
{
	public const string MqttSettingsName = "MqttSettings";
	public string MqttHost { get; set; }
	public int MqttPort { get; set; }
}
