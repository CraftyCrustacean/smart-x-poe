using backend.Models.Telemetry;
using backend.Services.Snapshots;
using backend.Services.Telemetry;

namespace backend.BackgroundServices;

public sealed class BatchCloseHandler : IHostedService
{
    private readonly TelemetryBatcher _batcher;
    private readonly DisconnectDetector _disconnectDetector;
    private readonly ILogger<BatchCloseHandler> _logger;
    private readonly SnapshotBuilder _snapshotBuilder;
    private readonly DashboardSummaryService _summaryService;

    public BatchCloseHandler(
        TelemetryBatcher batcher,
        DisconnectDetector disconnectDetector,
        ILogger<BatchCloseHandler> logger,
        SnapshotBuilder snapshotBuilder,
        DashboardSummaryService summaryService
    )
    {
        _batcher = batcher;
        _disconnectDetector = disconnectDetector;
        _logger = logger;
        _snapshotBuilder = snapshotBuilder;
        _summaryService = summaryService;
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
        var disconnects = _disconnectDetector.Detect(batch);
        var scopes = _snapshotBuilder.Build(batch);
        _summaryService.RecordBatch(batch);

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
