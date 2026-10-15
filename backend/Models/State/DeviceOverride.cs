using System.Text.Json.Serialization;

namespace backend.Models.State;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OverrideKind
{
    ValveOpen,
    ValveClosed,
    Rebooting,
}

public sealed record DeviceOverride(OverrideKind Kind, long ValidUntilBatch, long CommandId);
