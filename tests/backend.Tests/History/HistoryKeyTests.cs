using backend.Models.History;

namespace backend.Tests.History;

public class HistoryKeyTests
{
    private static readonly DateTime Day = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void TimeGetsCheckedFirst()
    {
        var earlierTimeHigherSequence = new HistoryKey(Day, 99);
        var laterTimeLowerSequence = new HistoryKey(Day.AddDays(1), 1);

        Assert.True(earlierTimeHigherSequence.CompareTo(laterTimeLowerSequence) < 0);
        Assert.True(laterTimeLowerSequence.CompareTo(earlierTimeHigherSequence) > 0);
    }

    [Fact]
    public void SameTimeUsesSequence()
    {
        var first = new HistoryKey(Day, 1);
        var second = new HistoryKey(Day, 2);

        Assert.True(first.CompareTo(second) < 0);
        Assert.Equal(0, first.CompareTo(new HistoryKey(Day, 1)));
    }

    [Fact]
    public void StartAndEndCoverEverything()
    {
        var reading = new HistoryKey(Day, 42);

        Assert.True(HistoryKey.StartOf(Day).CompareTo(reading) < 0);
        Assert.True(HistoryKey.EndOf(Day).CompareTo(reading) > 0);
    }
}
