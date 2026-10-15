using System.Text.Json.Serialization;

namespace backend.Models.Commands;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CommandType
{
    OpenValve,
    CloseValve,
    Reboot,
    Mute,
    Unmute,
    Acknowledge,
}

public sealed record CommandTarget(string? DeviceId, string? Zone, string? Subzone);

public sealed record CommandRequest(CommandType Type, CommandTarget Target);

public sealed record CommandRecord(
    long Id,
    CommandType Type,
    CommandTarget Target,
    IReadOnlyList<string> DeviceIds,
    bool Reversible,
    DateTime IssuedAtUtc,
    long IssuedAtBatch
)
{
    public DateTime? UndoneAtUtc { get; init; }
}

public sealed record CommandOutcome(CommandRecord? Record, string? Error);
