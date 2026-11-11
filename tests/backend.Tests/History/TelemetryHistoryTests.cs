using backend.Models.Readings;
using backend.Services.History;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Tests.History;

public class TelemetryHistoryTests
{
    private static readonly DateTime Day0 = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private static TelemetryHistory<FlowRateReading> NewHistory(int capacity) =>
        new(Options.Create(new MeshSettings { HistoryCapacity = capacity }));

    private static FlowRateReading Reading(string deviceId, int day) =>
        new()
        {
            DeviceId = deviceId,
            TimeStamp = Day0.AddDays(day),
            BatteryLevel = 90,
            FlowRate = day,
        };

    [Fact]
    public void CapDropsOldOnes()
    {
        var history = NewHistory(capacity: 50);
        for (var day = 0; day < 120; day++)
            history.Add(Reading("A", day), sequence: day);

        var stats = history.Stats("A");

        Assert.Equal(50, stats.Stored);
        Assert.Equal(Day0.AddDays(70), stats.Oldest);
        Assert.Equal(Day0.AddDays(119), stats.Newest);
    }

    [Fact]
    public void OutOfOrderStillSorted()
    {
        var history = NewHistory(capacity: 100);
        long sequence = 0;
        foreach (var day in new[] { 5, 1, 4, 2, 3 })
            history.Add(Reading("A", day), ++sequence);

        Assert.Equal(new float[] { 1, 2, 3, 4, 5 }, history.Recent("A").Select(r => r.FlowRate));
        Assert.Equal(5, history.Latest("A")!.FlowRate);
    }

    [Fact]
    public void RecentGives30ByDefault()
    {
        var history = NewHistory(capacity: 1000);
        for (var day = 0; day < 100; day++)
            history.Add(Reading("A", day), day);

        var recent = history.Recent("A");

        Assert.Equal(TelemetryHistory<FlowRateReading>.TimelineLength, recent.Count);
        Assert.Equal(99, recent[^1].FlowRate);
    }

    [Fact]
    public void RangeEndsAndTruncateWork()
    {
        var history = NewHistory(capacity: 1000);
        for (var day = 0; day < 100; day++)
            history.Add(Reading("A", day), day);

        var all = history.Range("A", Day0.AddDays(10), Day0.AddDays(19), limit: 500);
        Assert.Equal(10, all.Returned);
        Assert.False(all.Truncated);
        Assert.Equal(10, all.Rows[0].FlowRate);
        Assert.Equal(19, all.Rows[^1].FlowRate);

        var limited = history.Range("A", Day0.AddDays(10), Day0.AddDays(19), limit: 4);
        Assert.True(limited.Truncated);
        Assert.Equal(new float[] { 16, 17, 18, 19 }, limited.Rows.Select(r => r.FlowRate));
        Assert.True(limited.VisitedNodes < limited.Stored);
    }

    [Fact]
    public void DevicesSeparateAndMissingIsEmpty()
    {
        var history = NewHistory(capacity: 100);
        history.Add(Reading("A", 1), 1);
        history.Add(Reading("B", 2), 2);

        Assert.Equal(1, history.Latest("A")!.FlowRate);
        Assert.Equal(2, history.Latest("B")!.FlowRate);
        Assert.Null(history.Latest("missing"));
        Assert.Empty(history.Recent("missing"));
        Assert.Equal(0, history.Stats("missing").Stored);
    }

    [Fact]
    public void ScanTimeOnlyIfAsked()
    {
        var history = NewHistory(capacity: 1000);
        for (var day = 0; day < 100; day++)
            history.Add(Reading("A", day), day);

        var plain = history.Range("A", Day0.AddDays(10), Day0.AddDays(19), limit: 500);
        var compared = history.Range(
            "A",
            Day0.AddDays(10),
            Day0.AddDays(19),
            limit: 500,
            compareLinearScan: true
        );

        Assert.Null(plain.LinearScanMicroseconds);
        Assert.NotNull(compared.LinearScanMicroseconds);
        Assert.Equal(plain.Rows, compared.Rows);
    }
}
