namespace backend.Services.Mesh;

public sealed class IndexedMinHeap
{
    private readonly int[] _heap;
    private readonly int[] _position;
    private readonly float[] _key;

    public IndexedMinHeap(int capacity)
    {
        _heap = new int[capacity];
        _position = new int[capacity];
        _key = new float[capacity];
        Array.Fill(_position, -1);
    }

    public int Count { get; private set; }

    public bool Contains(int vertex) => _position[vertex] >= 0;

    public bool InsertOrDecrease(int vertex, float key)
    {
        if (Contains(vertex))
        {
            if (key >= _key[vertex])
                return false;

            _key[vertex] = key;
            SiftUp(_position[vertex]);
            return true;
        }

        _key[vertex] = key;
        _heap[Count] = vertex;
        _position[vertex] = Count;
        Count++;
        SiftUp(Count - 1);
        return true;
    }

    public int ExtractMin() => ExtractMin(out _);

    public int ExtractMin(out float key)
    {
        if (Count == 0)
            throw new InvalidOperationException("The heap is empty.");

        var min = _heap[0];
        key = _key[min];

        Count--;
        if (Count > 0)
        {
            Place(_heap[Count], 0);
            SiftDown(0);
        }
        _position[min] = -1;

        return min;
    }

    private void SiftUp(int slot)
    {
        var vertex = _heap[slot];
        while (slot > 0)
        {
            var parentSlot = (slot - 1) / 2;
            var parent = _heap[parentSlot];
            if (_key[parent] <= _key[vertex])
                break;

            Place(parent, slot);
            slot = parentSlot;
        }
        Place(vertex, slot);
    }

    private void SiftDown(int slot)
    {
        var vertex = _heap[slot];
        while (true)
        {
            var child = 2 * slot + 1;
            if (child >= Count)
                break;

            if (child + 1 < Count && _key[_heap[child + 1]] < _key[_heap[child]])
                child++;

            if (_key[_heap[child]] >= _key[vertex])
                break;

            Place(_heap[child], slot);
            slot = child;
        }
        Place(vertex, slot);
    }

    private void Place(int vertex, int slot)
    {
        _heap[slot] = vertex;
        _position[vertex] = slot;
    }
}
