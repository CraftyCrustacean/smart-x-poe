namespace backend.Models.History;

public readonly record struct HistoryKey(DateTime Time, long Sequence) : IComparable<HistoryKey>
{
    public int CompareTo(HistoryKey other) =>
        Time != other.Time ? Time.CompareTo(other.Time) : Sequence.CompareTo(other.Sequence);

    public static HistoryKey StartOf(DateTime time) => new(time, long.MinValue);

    public static HistoryKey EndOf(DateTime time) => new(time, long.MaxValue);
}
