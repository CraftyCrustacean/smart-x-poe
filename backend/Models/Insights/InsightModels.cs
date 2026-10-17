using backend.Models.Commands;

namespace backend.Models.Insights;

public readonly record struct ActionKey(string Action, string Scope);

public sealed record Suggestion(
    string Id,
    string Kind,
    string Action,
    CommandTarget? Target,
    string DeviceId,
    string Zone,
    string Subzone,
    int Tier,
    float Severity,
    float Confidence,
    string TriggerVersion,
    SuggestionCause Cause,
    IReadOnlyList<string> Sources
);

public sealed record SuggestionCause(string Type, string? Metric, float Value, string DeviceId);

public sealed record LearnedTransition(
    string Metric,
    string Action,
    string Scope,
    int Count
);

public sealed record DismissRequest(string Id, string TriggerVersion);
