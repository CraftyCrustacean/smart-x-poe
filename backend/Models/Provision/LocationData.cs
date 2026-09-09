using System.Text.Json.Serialization;

namespace backend.Models.Provision;

public class LocationData
{
    [JsonPropertyName("latitude")]
    public required float Latitude { get; set; }
    [JsonPropertyName("longitude")]
    public required float Longitude { get; set; }
    [JsonPropertyName("chainage_km")]
    public required float Chainage { get; set; }

}
