using backend.Models.Telemetry;
using backend.Services;
using backend.Services.Insights;
using backend.Services.Snapshots;
using backend.Services.State;
using backend.Services.Telemetry;

namespace backend.BackgroundServices;

public sealed class BatchCloseHandler : IHostedService
{
    private readonly TelemetryBatcher _batcher;
    private readonly DisconnectDetector _disconnectDetector;
    private readonly ILogger<BatchCloseHandler> _logger;
    private readonly SnapshotBuilder _snapshotBuilder;
    private readonly DashboardSummaryService _summaryService;
    private readonly LiveUpdates _liveUpdates;
    private readonly BatchClock _batchClock;
    private readonly InsightEngine _insights;

    public BatchCloseHandler(
        TelemetryBatcher batcher,
        DisconnectDetector disconnectDetector,
        ILogger<BatchCloseHandler> logger,
        SnapshotBuilder snapshotBuilder,
        DashboardSummaryService summaryService,
        LiveUpdates liveUpdates,
        BatchClock batchClock,
        InsightEngine insights
    )
    {
        _batcher = batcher;
        _disconnectDetector = disconnectDetector;
        _logger = logger;
        _snapshotBuilder = snapshotBuilder;
        _summaryService = summaryService;
        _liveUpdates = liveUpdates;
        _batchClock = batchClock;
        _insights = insights;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _batcher.BatchClosed += OnBatchClosed;
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _batcher.BatchClosed -= OnBatchClosed;
        return Task.CompletedTask;
    }

    private void OnBatchClosed(TelemetryBatch batch)
    {
        _batchClock.Advance();

        var disconnects = _disconnectDetector.Detect(batch);
        var scopes = _snapshotBuilder.Build(batch);
        _summaryService.RecordBatch(batch);

        try
        {
            _insights.Rebuild();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build insight, keeping previous.");
        }

        _liveUpdates.BatchClosed(_summaryService.Build());

        _logger.LogInformation(
            "Batch {BatchDate:yyyy-MM-dd} closed: {PacketCount} packets, {Scopes} scope snapshots, {New} newly disconnected, {Back} reconnected, {Offline} offline.",
            batch.Timestamp,
            batch.Packets.Count,
            scopes,
            disconnects.NewlyDisconnected,
            disconnects.Reconnected,
            disconnects.TotalDisconnected
        );
    }
}
