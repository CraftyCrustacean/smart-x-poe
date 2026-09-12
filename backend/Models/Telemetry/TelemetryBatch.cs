namespace backend.Models.Telemetry;

public class TelemetryBatch
{

    public required DateTime Timestamp { get; set; }
    public required List<TelemetryPacket> Packets { get; set; }

}

