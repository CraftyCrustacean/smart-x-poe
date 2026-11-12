using System.Diagnostics;
using backend.Models.Mesh;
using backend.Services.State;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Services.Mesh;

public sealed class MeshService
{
    private readonly DeviceRegistry _registry;
    private readonly DisconnectedDevices _disconnected;
    private readonly SimulatedFailures _failures;
    private readonly BatchClock _clock;
    private readonly MeshSettings _settings;
    private readonly ILogger<MeshService> _logger;
    private readonly Lock _topologyLock = new();
    private readonly Lock _rebuildLock = new();
    private MeshTopology? _topology;
    private MeshSnapshot? _snapshot;

    public MeshService(
        DeviceRegistry registry,
        DisconnectedDevices disconnected,
        SimulatedFailures failures,
        BatchClock clock,
        IOptions<MeshSettings> settings,
        ILogger<MeshService> logger
    )
    {
        _registry = registry;
        _disconnected = disconnected;
        _failures = failures;
        _clock = clock;
        _settings = settings.Value;
        _logger = logger;
    }

    public MeshTopology GetTopology()
    {
        var current = Volatile.Read(ref _topology);
        if (current is not null && current.DeviceCount == _registry.Count)
            return current;

        lock (_topologyLock)
        {
            current = _topology;
            if (current is not null && current.DeviceCount == _registry.Count)
                return current;

            var built = MeshTopology.Build(_registry.Snapshot(), _settings);
            Volatile.Write(ref _topology, built);

            _logger.LogInformation(
                "Mesh topology built: {Vertices} vertices, {Links} links, {GatewayLinks} gateway links, in {Ms:F1} ms.",
                built.Vertices.Length,
                built.Links.Length,
                built.Adjacency[MeshTopology.Gateway].Length,
                built.BuildMs
            );

            return built;
        }
    }

    public MeshSnapshot GetSnapshot()
    {
        var current = Volatile.Read(ref _snapshot);
        if (current is not null && current.Topology.DeviceCount == _registry.Count)
            return current;

        lock (_rebuildLock)
        {
            current = _snapshot;
            if (current is not null && current.Topology.DeviceCount == _registry.Count)
                return current;

            return Rebuild();
        }
    }

    public MeshSnapshot Rebuild()
    {
        lock (_rebuildLock)
        {
            var started = Stopwatch.GetTimestamp();
            var topology = GetTopology();
            var n = topology.Vertices.Length;

            var failed = _failures.Snapshot().ToHashSet();
            var disconnected = _disconnected.Snapshot().ToHashSet();

            var online = new bool[n];
            var status = new NodeStatus[n];
            var anyDown = false;
            for (var v = 0; v < n; v++)
            {
                var id = topology.Vertices[v].Id;
                if (v != MeshTopology.Gateway && failed.Contains(id))
                    status[v] = NodeStatus.Failed;
                else if (v != MeshTopology.Gateway && disconnected.Contains(id))
                    status[v] = NodeStatus.Offline;
                else
                {
                    status[v] = NodeStatus.Online;
                    online[v] = true;
                    continue;
                }
                anyDown = true;
            }

            var bfs = MeshAlgorithms.Bfs(topology, online);
            for (var v = 0; v < n; v++)
                if (online[v] && bfs.Hops[v] < 0)
                    status[v] = NodeStatus.CutOff;

            var mst = MeshAlgorithms.Prim(topology, online);
            var dijkstra = MeshAlgorithms.Dijkstra(topology, online);

            int[] healthyParent;
            IReadOnlyList<HealingEntry> healing;
            if (anyDown)
            {
                var allUp = new bool[n];
                Array.Fill(allUp, true);
                healthyParent = MeshAlgorithms.Prim(topology, allUp).Parent;
                healing = MeshAlgorithms.Healing(topology, healthyParent, mst.Parent, status);
            }
            else
            {
                healthyParent = mst.Parent;
                healing = [];
            }

            var counts = new MeshCounts(
                topology.DeviceCount,
                status.Skip(1).Count(s => s == NodeStatus.Online),
                status.Count(s => s == NodeStatus.Offline),
                status.Count(s => s == NodeStatus.Failed),
                status.Count(s => s == NodeStatus.CutOff)
            );

            var snapshot = new MeshSnapshot(
                topology,
                _clock.Current,
                DateTime.UtcNow,
                Stopwatch.GetElapsedTime(started).TotalMilliseconds,
                online,
                status,
                bfs.Parent,
                bfs.Hops,
                mst.Parent,
                MeshAlgorithms.Depths(mst.Parent),
                healthyParent,
                dijkstra.Parent,
                dijkstra.Cost,
                mst.TotalCost,
                MeshAlgorithms.OnlineLinksCost(topology, online),
                healing,
                counts
            );

            Volatile.Write(ref _snapshot, snapshot);

            _logger.LogDebug(
                "Mesh rebuilt in {Ms:F1} ms: {Online} online, {Offline} offline, {Failed} failed, {CutOff} cut off.",
                snapshot.RebuildMs,
                counts.Online,
                counts.Offline,
                counts.Failed,
                counts.CutOff
            );

            return snapshot;
        }
    }

    public (int Changed, MeshSnapshot Snapshot) Fail(IEnumerable<string> deviceIds)
    {
        var changed = 0;
        foreach (var id in deviceIds)
            if (_failures.TryAdd(id))
                changed++;

        return (changed, changed > 0 ? Rebuild() : GetSnapshot());
    }

    public (int Changed, MeshSnapshot Snapshot) Restore(IEnumerable<string>? deviceIds)
    {
        var changed = 0;
        foreach (var id in deviceIds ?? _failures.Snapshot())
            if (_failures.Remove(id))
                changed++;

        return (changed, changed > 0 ? Rebuild() : GetSnapshot());
    }

    public int FailedCount => _failures.Count;
}
