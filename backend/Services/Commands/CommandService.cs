using backend.Models.Commands;
using backend.Models.State;
using backend.Services.State;
using backend.Services.Telemetry;
using static backend.Models.Provision.ProvisionData;

namespace backend.Services.Commands;

public sealed class CommandService
{
    public const int GraceBatches = 3;
    private const int HistoryLimit = 100;

    private sealed record UndoEntry(
        CommandRecord Record,
        IReadOnlyDictionary<string, DeviceOverride?> PriorOverrides
    );

    private readonly Stack<UndoEntry> _undo = new();
    private readonly LinkedList<CommandRecord> _history = new();
    private readonly Lock _lock = new();
    private long _lastId;

    private readonly DeviceRegistry _registry;
    private readonly MutedDevices _muted;
    private readonly AcknowledgedAlerts _acknowledged;
    private readonly ActiveAlerts _alerts;
    private readonly BatchClock _clock;
    private readonly LiveUpdates _live;

    public CommandService(
        DeviceRegistry registry,
        MutedDevices muted,
        AcknowledgedAlerts acknowledged,
        ActiveAlerts alerts,
        BatchClock clock,
        LiveUpdates live
    )
    {
        _registry = registry;
        _muted = muted;
        _acknowledged = acknowledged;
        _alerts = alerts;
        _clock = clock;
        _live = live;
    }

    public CommandOutcome Issue(CommandRequest request)
    {
        var targets = ResolveTargets(request);
        if (targets.Count == 0)
            return new(null, "No matching devices for this command and target.");

        CommandRecord record;

        lock (_lock)
        {
            var id = _lastId + 1;
            var batch = _clock.Current;
            var priors = new Dictionary<string, DeviceOverride?>();
            var muteChanged = new List<string>();
            var ackAdded = new List<AlertKey>();
            var rebooting = 0;

            foreach (var device in targets)
            {
                switch (request.Type)
                {
                    case CommandType.OpenValve or CommandType.CloseValve
                        when IsRebooting(device.DeviceId, batch):
                        rebooting++;
                        break;

                    case CommandType.OpenValve or CommandType.CloseValve or CommandType.Reboot:
                        var kind = request.Type switch
                        {
                            CommandType.OpenValve => OverrideKind.ValveOpen,
                            CommandType.CloseValve => OverrideKind.ValveClosed,
                            _ => OverrideKind.Rebooting,
                        };
                        var o = new DeviceOverride(kind, batch + GraceBatches, id);
                        if (
                            _registry.TryApply(
                                device.DeviceId,
                                s => s with { Override = o },
                                out var before
                            )
                        )
                            priors[device.DeviceId] = before!.Override;
                        break;

                    case CommandType.Mute:
                        if (_muted.TryAdd(device.DeviceId))
                            muteChanged.Add(device.DeviceId);
                        break;

                    case CommandType.Unmute:
                        if (_muted.Remove(device.DeviceId))
                            muteChanged.Add(device.DeviceId);
                        break;

                    case CommandType.Acknowledge:
                        foreach (var metric in ThresholdEvaluator.Metrics)
                        {
                            var key = new AlertKey(device.DeviceId, metric);
                            if (_alerts.Contains(key) && _acknowledged.TryAdd(key))
                                ackAdded.Add(key);
                        }
                        break;
                }
            }

            var affected = request.Type switch
            {
                CommandType.Mute or CommandType.Unmute => muteChanged,
                CommandType.Acknowledge => ackAdded.Select(k => k.DeviceId).Distinct().ToList(),
                _ => priors.Keys.ToList(),
            };

            if (affected.Count == 0 && rebooting > 0)
                return new(
                    null,
                    rebooting == 1 ? "Device is rebooting." : "All targeted devices are rebooting."
                );

            if (affected.Count == 0)
                return new(
                    null,
                    "The command made no change (already in that state, or nothing to acknowledge)."
                );

            _lastId = id;
            var undoable = request.Type is CommandType.OpenValve or CommandType.CloseValve;
            record = new CommandRecord(
                id,
                request.Type,
                request.Target,
                affected,
                undoable,
                DateTime.UtcNow,
                batch
            );

            if (undoable)
                _undo.Push(new UndoEntry(record, priors));

            _history.AddFirst(record);
            if (_history.Count > HistoryLimit)
                _history.RemoveLast();
        }

        _live.CommandsChanged(record);
        return new(record, null);
    }

    public CommandRecord? Undo()
    {
        CommandRecord undone;

        lock (_lock)
        {
            DropExpired();
            if (!_undo.TryPop(out var entry))
                return null;
            var commandId = entry.Record.Id;

            foreach (var (deviceId, prior) in entry.PriorOverrides)
            {
                _registry.TryApply(
                    deviceId,
                    s => s.Override?.CommandId == commandId ? s with { Override = prior } : s,
                    out _
                );
            }

            undone = entry.Record with { UndoneAtUtc = DateTime.UtcNow };
            for (var node = _history.First; node != null; node = node.Next)
            {
                if (node.Value.Id == commandId)
                {
                    node.Value = undone;
                    break;
                }
            }
        }

        _live.CommandsChanged(undone);
        return undone;
    }

    public (IReadOnlyList<CommandRecord> History, long? UndoableId) GetHistory()
    {
        lock (_lock)
        {
            DropExpired();
            return (_history.ToList(), _undo.TryPeek(out var top) ? top.Record.Id : null);
        }
    }

    private void DropExpired()
    {
        if (_undo.TryPeek(out var top) && top.Record.IssuedAtBatch + GraceBatches <= _clock.Current)
            _undo.Clear();
    }

    private bool IsRebooting(string deviceId, long batch) =>
        _registry.TryGet(deviceId, out var state)
        && state.Override is { Kind: OverrideKind.Rebooting } o
        && o.ValidUntilBatch > batch;

    private IReadOnlyList<DeviceState> ResolveTargets(CommandRequest request)
    {
        var target = request.Target;
        IEnumerable<DeviceState> devices;

        if (target.DeviceId is { } id)
            devices = _registry.TryGet(id, out var state) ? [state] : [];
        else if (target.Zone is { } zone && target.Subzone is { } subzone)
            devices = _registry.Snapshot().Where(d => d.Zone == zone && d.Subzone == subzone);
        else
            devices = [];

        return request.Type is CommandType.OpenValve or CommandType.CloseValve
            ? devices.Where(d => d.Category == DeviceCategory.Actuator).ToList()
            : devices.ToList();
    }
}
