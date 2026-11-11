using backend.Services.Mesh;

namespace backend.Tests.Mesh;

public class IndexedMinHeapTests
{
    [Fact]
    public void ComesOutInOrder()
    {
        var heap = new IndexedMinHeap(5);
        heap.InsertOrDecrease(0, 5);
        heap.InsertOrDecrease(1, 1);
        heap.InsertOrDecrease(2, 4);
        heap.InsertOrDecrease(3, 2);
        heap.InsertOrDecrease(4, 3);

        var order = new List<int>();
        while (heap.Count > 0)
            order.Add(heap.ExtractMin());

        Assert.Equal(new[] { 1, 3, 4, 2, 0 }, order);
    }

    [Fact]
    public void DecreaseMovesItUp()
    {
        var heap = new IndexedMinHeap(3);
        heap.InsertOrDecrease(0, 10);
        heap.InsertOrDecrease(1, 20);
        heap.InsertOrDecrease(2, 30);

        Assert.True(heap.InsertOrDecrease(2, 5));

        Assert.Equal(2, heap.ExtractMin(out var key));
        Assert.Equal(5, key);
        Assert.Equal(2, heap.Count);
    }

    [Fact]
    public void HigherKeyIgnored()
    {
        var heap = new IndexedMinHeap(2);
        heap.InsertOrDecrease(0, 3);
        heap.InsertOrDecrease(1, 4);

        Assert.False(heap.InsertOrDecrease(0, 9));

        Assert.Equal(0, heap.ExtractMin(out var key));
        Assert.Equal(3, key);
    }

    [Fact]
    public void ContainsWorks()
    {
        var heap = new IndexedMinHeap(2);
        Assert.False(heap.Contains(0));

        heap.InsertOrDecrease(0, 1);
        Assert.True(heap.Contains(0));

        heap.ExtractMin();
        Assert.False(heap.Contains(0));
    }

    [Fact]
    public void EmptyThrows()
    {
        Assert.Throws<InvalidOperationException>(() => new IndexedMinHeap(1).ExtractMin());
    }

    [Fact]
    public void RandomStuffComesOutSorted()
    {
        var random = new Random(2026);
        const int n = 500;
        var heap = new IndexedMinHeap(n);
        var lowest = new float[n];
        Array.Fill(lowest, float.PositiveInfinity);

        for (var op = 0; op < 5_000; op++)
        {
            var v = random.Next(n);
            var key = (float)(random.NextDouble() * 1000);
            heap.InsertOrDecrease(v, key);
            lowest[v] = Math.Min(lowest[v], key);
        }

        var seen = new HashSet<int>();
        var previous = float.NegativeInfinity;
        while (heap.Count > 0)
        {
            var v = heap.ExtractMin(out var key);

            Assert.True(key >= previous, "keys came out of order");
            Assert.Equal(lowest[v], key);
            Assert.True(seen.Add(v), "got the same vertex twice");
            previous = key;
        }

        Assert.Equal(lowest.Count(k => !float.IsPositiveInfinity(k)), seen.Count);
    }
}
