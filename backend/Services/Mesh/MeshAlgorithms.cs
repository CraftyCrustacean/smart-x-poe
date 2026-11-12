using backend.Models.Mesh;

namespace backend.Services.Mesh;

public static class MeshAlgorithms
{
    public sealed record BfsResult(int[] Parent, int[] Hops);

    public sealed record PrimResult(int[] Parent, float TotalCost);

    public sealed record DijkstraResult(int[] Parent, float[] Cost);

    public static BfsResult Bfs(MeshTopology topology, bool[] online, int source = MeshTopology.Gateway)
    {
        var n = CheckOnline(topology, online);
        var parent = NewFilled(n, -1);
        var hops = NewFilled(n, -1);
        if (!online[source])
            return new BfsResult(parent, hops);

        var queue = new Queue<int>();
        hops[source] = 0;
        queue.Enqueue(source);

        while (queue.Count > 0)
        {
            var u = queue.Dequeue();
            foreach (var edge in topology.Adjacency[u])
            {
                var v = edge.To;
                if (!online[v] || hops[v] >= 0)
                    continue;

                hops[v] = hops[u] + 1;
                parent[v] = u;
                queue.Enqueue(v);
            }
        }

        return new BfsResult(parent, hops);
    }

    public static PrimResult Prim(MeshTopology topology, bool[] online)
    {
        var n = CheckOnline(topology, online);
        var parent = NewFilled(n, -1);
        if (!online[MeshTopology.Gateway])
            return new PrimResult(parent, 0);

        var key = new float[n];
        Array.Fill(key, float.PositiveInfinity);
        var inTree = new bool[n];
        var heap = new IndexedMinHeap(n);
        var total = 0f;

        key[MeshTopology.Gateway] = 0;
        heap.InsertOrDecrease(MeshTopology.Gateway, 0);

        while (heap.Count > 0)
        {
            var u = heap.ExtractMin();
            inTree[u] = true;
            total += key[u];

            foreach (var edge in topology.Adjacency[u])
            {
                var v = edge.To;
                if (!online[v] || inTree[v] || edge.Cost >= key[v])
                    continue;

                key[v] = edge.Cost;
                parent[v] = u;
                heap.InsertOrDecrease(v, edge.Cost);
            }
        }

        return new PrimResult(parent, total);
    }

    public static DijkstraResult Dijkstra(MeshTopology topology, bool[] online)
    {
        var n = CheckOnline(topology, online);
        var parent = NewFilled(n, -1);
        var cost = new float[n];
        Array.Fill(cost, float.PositiveInfinity);
        if (!online[MeshTopology.Gateway])
            return new DijkstraResult(parent, cost);

        var done = new bool[n];
        var heap = new IndexedMinHeap(n);

        cost[MeshTopology.Gateway] = 0;
        heap.InsertOrDecrease(MeshTopology.Gateway, 0);

        while (heap.Count > 0)
        {
            var u = heap.ExtractMin();
            done[u] = true;

            foreach (var edge in topology.Adjacency[u])
            {
                var v = edge.To;
                var through = cost[u] + edge.Cost;
                if (!online[v] || done[v] || through >= cost[v])
                    continue;

                cost[v] = through;
                parent[v] = u;
                heap.InsertOrDecrease(v, through);
            }
        }

        return new DijkstraResult(parent, cost);
    }

    public static List<int> PathTo(int[] parent, int v, int root = MeshTopology.Gateway)
    {
        var path = new List<int>();
        if (v != root && parent[v] < 0)
            return path;

        var current = v;
        while (true)
        {
            path.Add(current);
            if (current == root)
                return path;
            if (path.Count > parent.Length)
                throw new InvalidOperationException("The parent array contains a cycle.");
            current = parent[current];
            if (current < 0)
                throw new InvalidOperationException("The route does not reach the root.");
        }
    }

    public static float LinkCost(MeshTopology topology, int a, int b)
    {
        foreach (var edge in topology.Adjacency[a])
            if (edge.To == b)
                return edge.Cost;

        throw new ArgumentException($"Vertices {a} and {b} are not linked.");
    }

    public static float RouteCost(MeshTopology topology, IReadOnlyList<int> path)
    {
        var total = 0f;
        for (var i = 0; i + 1 < path.Count; i++)
            total += LinkCost(topology, path[i], path[i + 1]);
        return total;
    }

    public static float OnlineLinksCost(MeshTopology topology, bool[] online)
    {
        CheckOnline(topology, online);
        var total = 0f;
        foreach (var link in topology.Links)
            if (online[link.A] && online[link.B])
                total += link.Cost;
        return total;
    }

    public static List<HealingEntry> Healing(
        MeshTopology topology,
        int[] healthyParent,
        int[] liveParent,
        NodeStatus[] status
    )
    {
        var n = topology.Vertices.Length;
        if (healthyParent.Length != n || liveParent.Length != n || status.Length != n)
            throw new ArgumentException("Arrays must have one entry per vertex.");

        var children = new List<int>?[n];
        for (var v = 0; v < n; v++)
        {
            var p = healthyParent[v];
            if (p >= 0)
                (children[p] ??= new List<int>()).Add(v);
        }

        var report = new List<HealingEntry>();
        for (var down = 0; down < n; down++)
        {
            if (!IsDown(status[down]) || children[down] is null)
                continue;

            foreach (var dependant in children[down]!)
            {
                if (IsDown(status[dependant]))
                    continue;

                var route = PathTo(liveParent, dependant);
                report.Add(
                    route.Count == 0
                        ? new HealingEntry(down, dependant, null, null, null)
                        : new HealingEntry(
                            down,
                            dependant,
                            liveParent[dependant],
                            route.Count - 1,
                            RouteCost(topology, route)
                        )
                );
            }
        }

        return report;
    }

    public static int[] Depths(int[] parent, int root = MeshTopology.Gateway)
    {
        const int Unknown = -2;
        var depth = NewFilled(parent.Length, Unknown);
        depth[root] = 0;
        var pending = new Stack<int>();

        for (var v = 0; v < parent.Length; v++)
        {
            var u = v;
            while (depth[u] == Unknown)
            {
                if (parent[u] < 0)
                {
                    depth[u] = -1;
                    break;
                }
                pending.Push(u);
                if (pending.Count > parent.Length)
                    throw new InvalidOperationException("The parent array contains a cycle.");
                u = parent[u];
            }

            var d = depth[u];
            while (pending.Count > 0)
            {
                d = d < 0 ? -1 : d + 1;
                depth[pending.Pop()] = d;
            }
        }

        return depth;
    }

    private static bool IsDown(NodeStatus status) =>
        status is NodeStatus.Offline or NodeStatus.Failed;

    private static int CheckOnline(MeshTopology topology, bool[] online)
    {
        if (online.Length != topology.Vertices.Length)
            throw new ArgumentException("online[] needs one flag per vertex.", nameof(online));
        return online.Length;
    }

    private static int[] NewFilled(int length, int value)
    {
        var array = new int[length];
        Array.Fill(array, value);
        return array;
    }
}
