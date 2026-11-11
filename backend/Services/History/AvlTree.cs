using System.Diagnostics.CodeAnalysis;

namespace backend.Services.History;

public sealed class AvlTree<TKey, TValue>
    where TKey : IComparable<TKey>
{
    private sealed class Node(TKey key, TValue value)
    {
        public readonly TKey Key = key;
        public TValue Value = value;
        public Node? Left;
        public Node? Right;
        public int Height = 1;
    }

    private Node? _root;

    public int Count { get; private set; }

    public long Rotations { get; private set; }

    public int Height => HeightOf(_root);

    public int MaxPossibleHeight => MaxHeightFor(Count);

    public bool Insert(TKey key, TValue value)
    {
        var added = false;
        _root = Insert(_root, key, value, ref added);
        if (added)
            Count++;
        return added;
    }

    private Node Insert(Node? node, TKey key, TValue value, ref bool added)
    {
        if (node is null)
        {
            added = true;
            return new Node(key, value);
        }

        var cmp = key.CompareTo(node.Key);
        if (cmp < 0)
            node.Left = Insert(node.Left, key, value, ref added);
        else if (cmp > 0)
            node.Right = Insert(node.Right, key, value, ref added);
        else
        {
            node.Value = value;
            return node;
        }

        return Rebalance(node);
    }

    public bool RemoveMin()
    {
        if (_root is null)
            return false;

        _root = RemoveMin(_root);
        Count--;
        return true;
    }

    private Node? RemoveMin(Node node)
    {
        if (node.Left is null)
            return node.Right;

        node.Left = RemoveMin(node.Left);
        return Rebalance(node);
    }

    public bool TryGetMin([MaybeNullWhen(false)] out TKey key, [MaybeNullWhen(false)] out TValue value)
    {
        var node = _root;
        if (node is null)
        {
            key = default;
            value = default;
            return false;
        }

        while (node.Left is not null)
            node = node.Left;

        key = node.Key;
        value = node.Value;
        return true;
    }

    public bool TryGetMax([MaybeNullWhen(false)] out TKey key, [MaybeNullWhen(false)] out TValue value)
    {
        var node = _root;
        if (node is null)
        {
            key = default;
            value = default;
            return false;
        }

        while (node.Right is not null)
            node = node.Right;

        key = node.Key;
        value = node.Value;
        return true;
    }

    public List<TValue> Last(int count)
    {
        var output = new List<TValue>(Math.Clamp(count, 0, Count));
        if (count > 0)
            CollectLast(_root, count, output);

        output.Reverse();
        return output;
    }

    private static void CollectLast(Node? node, int count, List<TValue> output)
    {
        if (node is null || output.Count >= count)
            return;

        CollectLast(node.Right, count, output);
        if (output.Count >= count)
            return;

        output.Add(node.Value);
        CollectLast(node.Left, count, output);
    }

    public List<TValue> Range(TKey from, TKey to, int limit, out int visited)
    {
        visited = 0;
        var output = new List<TValue>();
        if (limit > 0 && from.CompareTo(to) <= 0)
            CollectRange(_root, from, to, limit, output, ref visited);

        output.Reverse();
        return output;
    }

    private static void CollectRange(
        Node? node,
        TKey from,
        TKey to,
        int limit,
        List<TValue> output,
        ref int visited
    )
    {
        if (node is null || output.Count >= limit)
            return;

        visited++;

        if (node.Key.CompareTo(to) < 0)
            CollectRange(node.Right, from, to, limit, output, ref visited);

        if (output.Count >= limit)
            return;

        if (node.Key.CompareTo(from) >= 0 && node.Key.CompareTo(to) <= 0)
            output.Add(node.Value);

        if (node.Key.CompareTo(from) > 0)
            CollectRange(node.Left, from, to, limit, output, ref visited);
    }

    public List<TValue> ScanRange(TKey from, TKey to, int limit, out int visited)
    {
        visited = 0;
        if (limit <= 0)
            return [];

        var window = new Queue<TValue>();
        var stack = new Stack<Node>();
        var node = _root;

        while (node is not null || stack.Count > 0)
        {
            while (node is not null)
            {
                stack.Push(node);
                node = node.Left;
            }

            node = stack.Pop();
            visited++;

            if (node.Key.CompareTo(from) >= 0 && node.Key.CompareTo(to) <= 0)
            {
                window.Enqueue(node.Value);
                if (window.Count > limit)
                    window.Dequeue();
            }

            node = node.Right;
        }

        return [.. window];
    }

    public List<KeyValuePair<TKey, TValue>> ToList()
    {
        var output = new List<KeyValuePair<TKey, TValue>>(Count);
        var stack = new Stack<Node>();
        var node = _root;

        while (node is not null || stack.Count > 0)
        {
            while (node is not null)
            {
                stack.Push(node);
                node = node.Left;
            }

            node = stack.Pop();
            output.Add(new KeyValuePair<TKey, TValue>(node.Key, node.Value));
            node = node.Right;
        }

        return output;
    }

    public bool IsBalanced()
    {
        var nodes = 0;
        var height = Check(_root, default!, false, default!, false, ref nodes);
        return height >= 0 && nodes == Count;
    }

    private static int Check(
        Node? node,
        TKey lower,
        bool hasLower,
        TKey upper,
        bool hasUpper,
        ref int nodes
    )
    {
        if (node is null)
            return 0;

        nodes++;
        if (hasLower && node.Key.CompareTo(lower) <= 0)
            return -1;
        if (hasUpper && node.Key.CompareTo(upper) >= 0)
            return -1;

        var left = Check(node.Left, lower, hasLower, node.Key, true, ref nodes);
        if (left < 0)
            return -1;

        var right = Check(node.Right, node.Key, true, upper, hasUpper, ref nodes);
        if (right < 0)
            return -1;

        if (Math.Abs(left - right) > 1)
            return -1;

        var height = 1 + Math.Max(left, right);
        return height == node.Height ? height : -1;
    }

    public static int MaxHeightFor(int count)
    {
        if (count <= 0)
            return 0;

        var height = 1;
        long previous = 0;
        long current = 1;
        while (true)
        {
            var next = current + previous + 1;
            if (next > count)
                return height;

            previous = current;
            current = next;
            height++;
        }
    }

    private static int HeightOf(Node? node) => node?.Height ?? 0;

    private static int BalanceOf(Node node) => HeightOf(node.Left) - HeightOf(node.Right);

    private static void UpdateHeight(Node node) =>
        node.Height = 1 + Math.Max(HeightOf(node.Left), HeightOf(node.Right));

    private Node Rebalance(Node node)
    {
        UpdateHeight(node);
        var balance = BalanceOf(node);

        if (balance > 1)
        {
            if (BalanceOf(node.Left!) < 0)
                node.Left = RotateLeft(node.Left!);
            return RotateRight(node);
        }

        if (balance < -1)
        {
            if (BalanceOf(node.Right!) > 0)
                node.Right = RotateRight(node.Right!);
            return RotateLeft(node);
        }

        return node;
    }

    private Node RotateRight(Node y)
    {
        var x = y.Left!;
        y.Left = x.Right;
        x.Right = y;

        UpdateHeight(y);
        UpdateHeight(x);
        Rotations++;
        return x;
    }

    private Node RotateLeft(Node x)
    {
        var y = x.Right!;
        x.Right = y.Left;
        y.Left = x;

        UpdateHeight(x);
        UpdateHeight(y);
        Rotations++;
        return y;
    }
}
