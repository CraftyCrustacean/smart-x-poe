using backend.Models.History;
using backend.Services.History;

namespace backend.Tests.History;

public class AvlTreeTests
{
    private static readonly DateTime Day0 = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(new[] { 3, 2, 1 }, 1)]
    [InlineData(new[] { 1, 2, 3 }, 1)]
    [InlineData(new[] { 3, 1, 2 }, 2)]
    [InlineData(new[] { 1, 3, 2 }, 2)]
    public void RotationsWork(int[] keys, int expectedRotations)
    {
        var tree = new AvlTree<int, string>();
        foreach (var key in keys)
            tree.Insert(key, $"v{key}");

        Assert.Equal(2, tree.Height);
        Assert.Equal(expectedRotations, (int)tree.Rotations);
        Assert.Equal(new[] { 1, 2, 3 }, tree.ToList().Select(p => p.Key));
        Assert.True(tree.IsBalanced());
    }

    [Fact]
    public void RemoveMinKeepsRightChild()
    {
        var tree = new AvlTree<int, string>();
        foreach (var key in new[] { 5, 3, 8, 4 })
            tree.Insert(key, $"v{key}");

        Assert.True(tree.RemoveMin());

        Assert.Equal(new[] { 4, 5, 8 }, tree.ToList().Select(p => p.Key));
        Assert.Equal(3, tree.Count);
        Assert.True(tree.IsBalanced());
    }

    [Fact]
    public void RemoveMinStillBalances()
    {
        var tree = new AvlTree<int, string>();
        foreach (var key in new[] { 2, 1, 3, 4 })
            tree.Insert(key, $"v{key}");
        var rotationsBefore = tree.Rotations;

        tree.RemoveMin();

        Assert.Equal(rotationsBefore + 1, tree.Rotations);
        Assert.Equal(2, tree.Height);
        Assert.True(tree.IsBalanced());
    }

    [Fact]
    public void EmptyTreeTest()
    {
        var tree = new AvlTree<int, string>();

        Assert.False(tree.RemoveMin());
        Assert.False(tree.TryGetMin(out _, out _));
        Assert.False(tree.TryGetMax(out _, out _));
        Assert.Empty(tree.Last(5));
        Assert.Empty(tree.Range(0, 100, 10, out var visited));
        Assert.Equal(0, visited);
        Assert.Equal(0, tree.Height);
        Assert.True(tree.IsBalanced());
    }

    [Fact]
    public void SameKeyOverwrites()
    {
        var tree = new AvlTree<int, string>();
        Assert.True(tree.Insert(1, "old"));

        Assert.False(tree.Insert(1, "new"));

        Assert.Equal(1, tree.Count);
        Assert.True(tree.TryGetMax(out _, out var value));
        Assert.Equal("new", value);
    }

    [Fact]
    public void InOrderInsertsHeightOk()
    {
        var tree = new AvlTree<int, int>();
        for (var i = 0; i < 1000; i++)
            tree.Insert(i, i);

        Assert.Equal(14, AvlTree<int, int>.MaxHeightFor(1000));
        Assert.True(tree.Height <= 14, $"height was {tree.Height}, too tall");
        Assert.True(tree.IsBalanced());
    }

    [Fact]
    public void RangeDoesntCheckEverything()
    {
        var tree = new AvlTree<int, int>();
        for (var i = 0; i < 1000; i++)
            tree.Insert(i, i);

        var rows = tree.Range(500, 514, 500, out var visited);

        Assert.Equal(Enumerable.Range(500, 15), rows);
        Assert.True(visited < 60, $"checked {visited} nodes, too many");
    }

    [Fact]
    public void RangeLimitGetsNewest()
    {
        var tree = new AvlTree<int, int>();
        for (var i = 0; i < 100; i++)
            tree.Insert(i, i);

        var rows = tree.Range(10, 89, 5, out _);

        Assert.Equal(new[] { 85, 86, 87, 88, 89 }, rows);
    }

    [Fact]
    public void RandomStuffMatchesSortedDict()
    {
        var random = new Random(12345);
        var tree = new AvlTree<HistoryKey, long>();
        var oracle = new SortedDictionary<HistoryKey, long>();
        const int cap = 400;
        long sequence = 0;

        for (var op = 1; op <= 10_000; op++)
        {
            var key = new HistoryKey(Day0.AddDays(random.Next(0, 300)), ++sequence);
            Assert.True(tree.Insert(key, sequence));
            oracle[key] = sequence;

            if (oracle.Count > cap)
            {
                Assert.True(tree.RemoveMin());
                oracle.Remove(oracle.Keys.First());
            }

            if (op % 500 == 0)
                AssertMatches(tree, oracle, random);
        }
    }

    private static void AssertMatches(
        AvlTree<HistoryKey, long> tree,
        SortedDictionary<HistoryKey, long> oracle,
        Random random
    )
    {
        Assert.True(tree.IsBalanced());
        Assert.Equal(oracle.Count, tree.Count);
        Assert.True(tree.Height <= tree.MaxPossibleHeight);
        Assert.Equal(oracle.Keys, tree.ToList().Select(p => p.Key));

        var n = random.Next(0, 50);
        Assert.Equal(oracle.Values.TakeLast(n), tree.Last(n));

        var fromDay = Day0.AddDays(random.Next(0, 300));
        var toDay = fromDay.AddDays(random.Next(0, 60));
        var limit = random.Next(1, 40);
        var from = HistoryKey.StartOf(fromDay);
        var to = HistoryKey.EndOf(toDay);

        var expected = oracle
            .Where(p => p.Key.CompareTo(from) >= 0 && p.Key.CompareTo(to) <= 0)
            .Select(p => p.Value)
            .TakeLast(limit);

        Assert.Equal(expected, tree.Range(from, to, limit, out _));
        Assert.Equal(expected, tree.ScanRange(from, to, limit, out var scanned));
        Assert.Equal(tree.Count, scanned);
    }
}
