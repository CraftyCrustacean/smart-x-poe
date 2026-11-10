namespace backend.Settings;

public class MeshSettings
{
    public const string MeshSettingsName = "Mesh";

    public double RadioRangeKm { get; set; } = 12;

    public double HopOverhead { get; set; } = 1;

    public string GatewayId { get; set; } = "GATEWAY-DURBAN";
    public double GatewayLatitude { get; set; } = -29.873;
    public double GatewayLongitude { get; set; } = 31.005;

    public int HistoryCapacity { get; set; } = 1000;
}
