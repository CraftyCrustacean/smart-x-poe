using System.Text.Json.Serialization;
using static backend.Models.Provision.ProvisionData;

namespace backend.Models.Provision;

public class DeviceRegistrationRequest
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

    [JsonPropertyName("topology")]
    public required RegistrationTopologyData Topology { get; set; }

    [JsonPropertyName("location")]
    public required RegistrationLocationData Location { get; set; }

}
public class RegistrationTopologyData
{
    [JsonPropertyName("region")]
    public required string Region { get; set; }

    [JsonPropertyName("zone")]
    public required string Zone { get; set; }

}

public class RegistrationLocationData
{
    [JsonPropertyName("latitude")]
    public required float Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public required float Longitude { get; set; }

    [JsonPropertyName("chainage_km")]
    public required float Chainage { get; set; }
}
