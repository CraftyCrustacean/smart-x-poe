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
    [JsonPropertyName("latitude")]
    public required float Latitude { get; set; }
    [JsonPropertyName("longitude")]
    public required float Longitude { get; set; }
    [JsonPropertyName("chainage_km")]
    public required float Chainage { get; set; }
    [JsonPropertyName("region")]
    public required string Region { get; set; }
    [JsonPropertyName("zone")]
    public required string Zone { get; set; }
    [JsonPropertyName("subzone")]
    public required string Subzone { get; set; }

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

