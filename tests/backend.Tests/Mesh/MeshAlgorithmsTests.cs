using backend.Models.Mesh;
using backend.Services.Mesh;

namespace backend.Tests.Mesh;

public class MeshAlgorithmsTests
{
    private static bool[] AllOnline(int n) => Enumerable.Repeat(true, n).ToArray();

    [Fact]
    public void BfsHopsWork()
    {
        var topology = MeshTopology.FromLinks(5, [(0, 1, 1), (1, 2, 1), (2, 3, 1), (0, 3, 50)]);

        var bfs = MeshAlgorithms.Bfs(topology, AllOnline(5));

        Assert.Equal(new[] { 0, 1, 2, 1, -1 }, bfs.Hops);
        Assert.Equal(new[] { -1, 0, 1, 0, -1 }, bfs.Parent);
    }

    [Fact]
    public void GoesAroundOffline()
    {
        var topology = MeshTopology.FromLinks(4, [(0, 1, 1), (1, 2, 1), (0, 3, 5), (3, 2, 5)]);
        var online = new[] { true, false, true, true };

        var bfs = MeshAlgorithms.Bfs(topology, online);
        var prim = MeshAlgorithms.Prim(topology, online);
        var dijkstra = MeshAlgorithms.Dijkstra(topology, online);

        Assert.Equal(-1, bfs.Hops[1]);
        Assert.Equal(3, bfs.Parent[2]);
        Assert.Equal(-1, prim.Parent[1]);
        Assert.Equal(3, prim.Parent[2]);
        Assert.Equal(10, prim.TotalCost);
        Assert.Equal(float.PositiveInfinity, dijkstra.Cost[1]);
        Assert.Equal(10, dijkstra.Cost[2]);
        Assert.Equal(new[] { 2, 3, 0 }, MeshAlgorithms.PathTo(dijkstra.Parent, 2));
    }

    [Fact]
    public void OfflineGatewayGetsNothing()
    {
        var topology = MeshTopology.FromLinks(2, [(0, 1, 1)]);
        var online = new[] { false, true };

        Assert.All(MeshAlgorithms.Bfs(topology, online).Hops, h => Assert.Equal(-1, h));
        Assert.Equal(0, MeshAlgorithms.Prim(topology, online).TotalCost);
        Assert.All(MeshAlgorithms.Dijkstra(topology, online).Cost, c => Assert.True(float.IsPositiveInfinity(c)));
    }

    [Fact]
    public void PrimMatchesBruteForce()
    {
        var random = new Random(7);
        for (var trial = 0; trial < 200; trial++)
        {
            var (topology, online) = RandomGraph(random, vertices: 7, maxLinks: 11);

            var prim = MeshAlgorithms.Prim(topology, online);
            var reachable = MeshAlgorithms.Bfs(topology, online).Hops.Select(h => h >= 0).ToArray();

            Assert.Equal(BruteForceMstCost(topology, online, reachable), prim.TotalCost, precision: 3);
            AssertIsTreeOverReachable(topology, prim.Parent, reachable, prim.TotalCost);
        }
    }

    private static float BruteForceMstCost(MeshTopology topology, bool[] online, bool[] reachable)
    {
        var links = topology
            .Links.Where(l => online[l.A] && online[l.B] && reachable[l.A])
            .ToArray();
        var k = reachable.Count(r => r);
        if (k <= 1)
            return 0;

        var best = float.PositiveInfinity;
        foreach (var subset in Subsets(links.Length, k - 1))
        {
            var group = Enumerable.Range(0, topology.Vertices.Length).ToArray();
            int Find(int x) => group[x] == x ? x : group[x] = Find(group[x]);

            var total = 0f;
            var acyclic = true;
            foreach (var i in subset)
            {
                int a = Find(links[i].A), b = Find(links[i].B);
                if (a == b)
                {
                    acyclic = false;
                    break;
                }
                group[a] = b;
                total += links[i].Cost;
            }

            if (acyclic)
                best = Math.Min(best, total);
        }
        return best;
    }

    private static IEnumerable<int[]> Subsets(int n, int size)
    {
        var chosen = new int[size];
        IEnumerable<int[]> Choose(int start, int depth)
        {
            if (depth == size)
            {
                yield return chosen;
                yield break;
            }
            for (var i = start; i <= n - (size - depth); i++)
            {
                chosen[depth] = i;
                foreach (var s in Choose(i + 1, depth + 1))
                    yield return s;
            }
        }
        return Choose(0, 0);
    }

    private static void AssertIsTreeOverReachable(
        MeshTopology topology,
        int[] parent,
        bool[] reachable,
        float total
    )
    {
        var sum = 0f;
        for (var v = 1; v < parent.Length; v++)
        {
            Assert.Equal(reachable[v], parent[v] >= 0);
            if (parent[v] >= 0)
            {
                sum += MeshAlgorithms.LinkCost(topology, v, parent[v]);
                Assert.Equal(MeshTopology.Gateway, MeshAlgorithms.PathTo(parent, v)[^1]);
            }
        }
        Assert.Equal(total, sum, precision: 3);
    }

    [Fact]
    public void DijkstraSameAsBellmanFord()
    {
        var random = new Random(11);
        for (var trial = 0; trial < 200; trial++)
        {
            var (topology, online) = RandomGraph(random, vertices: 10, maxLinks: 20);
            var n = topology.Vertices.Length;

            var expected = new float[n];
            Array.Fill(expected, float.PositiveInfinity);
            if (online[0])
                expected[0] = 0;
            for (var round = 0; round < n - 1; round++)
            {
                foreach (var link in topology.Links)
                {
                    if (!online[link.A] || !online[link.B])
                        continue;
                    expected[link.B] = Math.Min(expected[link.B], expected[link.A] + link.Cost);
                    expected[link.A] = Math.Min(expected[link.A], expected[link.B] + link.Cost);
                }
            }

            var dijkstra = MeshAlgorithms.Dijkstra(topology, online);

            for (var v = 0; v < n; v++)
            {
                if (float.IsPositiveInfinity(expected[v]))
                {
                    Assert.True(float.IsPositiveInfinity(dijkstra.Cost[v]));
                    continue;
                }

                Assert.Equal(expected[v], dijkstra.Cost[v], precision: 3);
                Assert.Equal(dijkstra.Cost[v], MeshAlgorithms.RouteCost(topology, MeshAlgorithms.PathTo(dijkstra.Parent, v)), precision: 3);
            }
        }
    }

    private static (MeshTopology, bool[]) RandomGraph(Random random, int vertices, int maxLinks)
    {
        var links = new List<(int, int, float)>();
        var used = new HashSet<(int, int)>();
        var count = random.Next(0, maxLinks + 1);
        while (links.Count < count)
        {
            int a = random.Next(vertices), b = random.Next(vertices);
            if (a == b || !used.Add((Math.Min(a, b), Math.Max(a, b))))
                continue;
            links.Add((a, b, random.Next(1, 20)));
        }

        var online = new bool[vertices];
        for (var v = 0; v < vertices; v++)
            online[v] = v == 0 || random.NextDouble() > 0.2;

        return (MeshTopology.FromLinks(vertices, links), online);
    }

    [Fact]
    public void HealingFindsNewHops()
    {
        var topology = MeshTopology.FromLinks(
            6,
            [(0, 1, 1), (1, 2, 1), (2, 3, 1), (0, 4, 5), (4, 3, 5), (1, 5, 1)]
        );

        var healthy = MeshAlgorithms.Prim(topology, AllOnline(6));
        Assert.Equal(new[] { -1, 0, 1, 2, 0, 1 }, healthy.Parent);

        var online = new[] { true, false, true, true, true, true };
        var live = MeshAlgorithms.Prim(topology, online);
        Assert.Equal(new[] { -1, -1, 3, 4, 0, -1 }, live.Parent);

        var status = new[]
        {
            NodeStatus.Online,
            NodeStatus.Failed,
            NodeStatus.Online,
            NodeStatus.Online,
            NodeStatus.Online,
            NodeStatus.CutOff,
        };

        var report = MeshAlgorithms.Healing(topology, healthy.Parent, live.Parent, status);

        Assert.Equal(
            new[]
            {
                new HealingEntry(1, 2, NewNextHop: 3, NewHops: 3, NewCost: 11),
                new HealingEntry(1, 5, null, null, null),
            },
            report
        );
    }

    [Fact]
    public void HealingSkipsDeadOnes()
    {
        var topology = MeshTopology.FromLinks(3, [(0, 1, 1), (1, 2, 1)]);
        var healthy = MeshAlgorithms.Prim(topology, AllOnline(3));
        var live = MeshAlgorithms.Prim(topology, [true, false, false]);
        var status = new[] { NodeStatus.Online, NodeStatus.Failed, NodeStatus.Offline };

        Assert.Empty(MeshAlgorithms.Healing(topology, healthy.Parent, live.Parent, status));
    }

    [Fact]
    public void PathToWorks()
    {
        var parent = new[] { -1, 0, 1, 2, -1 };

        Assert.Equal(new[] { 3, 2, 1, 0 }, MeshAlgorithms.PathTo(parent, 3));
        Assert.Equal(new[] { 0 }, MeshAlgorithms.PathTo(parent, 0));
        Assert.Empty(MeshAlgorithms.PathTo(parent, 4));
    }
}
