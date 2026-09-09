using System.Text.Json.Serialization;

namespace backend.Models.Provision;

public class TopologyData
{

    [JsonPropertyName("region")]
    public required string Region { get; set; }
    [JsonPropertyName("zone")]
    public required string Zone { get; set; }
    [JsonPropertyName("subzone")]
    public required string Subzone { get; set; }

}

