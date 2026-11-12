using backend.Models.Mesh;

namespace backend.Services.Mesh;

public static class MeshReports
{
    public static MeshStateDto State(MeshSnapshot s) =>
        new(
            s.ToSummary(),
            s.AllLinksCost,
            s.AllLinksCost > 0 ? Math.Round(100.0 * s.MstTotalCost / s.AllLinksCost, 2) : 0,
            s.BfsHops.Max(),
            s.MstHops.Max(),
            s.Status,
            s.MstParent,
            s.BfsHops
        );

    public static DeviceRoutesDto Routes(MeshSnapshot s, int v)
    {
        var t = s.Topology;
        var message = s.Status[v] switch
        {
            NodeStatus.Failed => "Simulated failure: this device is down.",
            NodeStatus.Offline => "Offline: no telemetry in the last batch.",
            NodeStatus.CutOff => "Cut off: every route to the gateway runs through devices that are down.",
            _ => null,
        };

        var healing = s
            .Healing.Where(h => h.Dependant == v)
            .Select(h => HealingEntry(s, h))
            .ToList();

        return new DeviceRoutesDto(
            t.Vertices[v].Id,
            s.Status[v],
            message,
            Route(t, s.BfsParent, v),
            Route(t, s.MstParent, v),
            Route(t, s.DijkstraParent, v),
            healing
        );
    }

    public static HealingReportDto Healing(MeshSnapshot s) =>
        new(
            s.Batch,
            s.Counts.Offline + s.Counts.Failed,
            s.Counts.CutOff,
            [.. s.Healing.Select(h => HealingEntry(s, h))]
        );

    public static ReachabilityDto Reachability(MeshSnapshot s, int source, string? zone, string? subzone)
    {
        var t = s.Topology;
        var hops = MeshAlgorithms.Bfs(t, s.Online, source).Hops;

        var reachable = new List<string>();
        var unreachable = new List<string>();
        var down = new List<string>();
        var rows = new Dictionary<(string Zone, string Subzone), int[]>();
        var rowStart = new Dictionary<(string Zone, string Subzone), float>();

        for (var v = 0; v < t.Vertices.Length; v++)
        {
            var vertex = t.Vertices[v];
            if (vertex.IsGateway)
                continue;
            if (zone is not null && vertex.Zone != zone)
                continue;
            if (subzone is not null && vertex.Subzone != subzone)
                continue;

            var key = (vertex.Zone!, vertex.Subzone!);
            if (!rows.TryGetValue(key, out var row))
            {
                rows[key] = row = new int[4];
                rowStart[key] = float.MaxValue;
            }
            rowStart[key] = Math.Min(rowStart[key], vertex.ChainageKm ?? 0);
            row[0]++;

            if (!s.Online[v])
            {
                down.Add(vertex.Id);
                row[3]++;
            }
            else if (hops[v] >= 0)
            {
                reachable.Add(vertex.Id);
                row[1]++;
            }
            else
            {
                unreachable.Add(vertex.Id);
                row[2]++;
            }
        }

        var subzones = rows.OrderBy(r => r.Key.Zone, StringComparer.Ordinal)
            .ThenBy(r => rowStart[r.Key])
            .Select(r => new SubzoneReachabilityDto(
                r.Key.Zone,
                r.Key.Subzone,
                r.Value[0],
                r.Value[1],
                r.Value[2],
                r.Value[3]
            ))
            .ToList();

        return new ReachabilityDto(
            t.Vertices[source].Id,
            s.Status[source],
            zone,
            subzone,
            reachable.Count,
            unreachable.Count,
            down.Count,
            subzones,
            reachable,
            unreachable,
            down
        );
    }

    private static MeshRouteDto Route(MeshTopology t, int[] parent, int v)
    {
        var path = MeshAlgorithms.PathTo(parent, v);
        if (path.Count == 0)
            return new MeshRouteDto([], 0, null, []);

        var steps = new List<RouteStepDto>(path.Count - 1);
        for (var i = 0; i + 1 < path.Count; i++)
        {
            var from = t.Vertices[path[i]];
            var to = t.Vertices[path[i + 1]];
            steps.Add(
                new RouteStepDto(
                    from.Id,
                    to.Id,
                    Math.Round(MeshTopology.DistanceKm(from.Latitude, from.Longitude, to.Latitude, to.Longitude), 3),
                    MeshAlgorithms.LinkCost(t, path[i], path[i + 1])
                )
            );
        }

        return new MeshRouteDto(
            [.. path.Select(p => t.Vertices[p].Id)],
            steps.Count,
            MeshAlgorithms.RouteCost(t, path),
            steps
        );
    }

    private static HealingEntryDto HealingEntry(MeshSnapshot s, HealingEntry h)
    {
        var ids = s.Topology.Vertices;
        return new HealingEntryDto(
            ids[h.Down].Id,
            s.Status[h.Down],
            ids[h.Dependant].Id,
            h.NewNextHop is int next ? ids[next].Id : null,
            h.NewHops,
            h.NewCost
        );
    }
}
