using System.Text.Json.Serialization;

namespace backend.Models.Provision;

public class ProvisionData
{

    [JsonPropertyName("device_id")]
    public required string DeviceId { get; set; }
    [JsonPropertyName("mac_address")]
    public required string MacAddress { get; set; }
    [JsonPropertyName("category")]
    public required DeviceCategory Category { get; set; }
    [JsonPropertyName("product_type")]
    public required string ProductType { get; set; }
    [JsonPropertyName("firmware_version")]
    public required string FirmwareVersion { get; set; }
    [JsonPropertyName("provisioned_at")]
    public required DateTime ProvisionedAt { get; set; }
    [JsonPropertyName("status")]
    public required DeviceStatus Status { get; set; }
    [JsonPropertyName("location")]
    public required LocationData LocationData { get; set; }
    [JsonPropertyName("topology")]
    public required TopologyData TopologyData { get; set; }
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum DeviceCategory
    {
        Environmental,
        Actuator,
        FlowRate

    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum DeviceStatus
    {
        active,
        inactive

    }


}

