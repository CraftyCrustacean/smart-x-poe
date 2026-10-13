using backend.Models.Telemetry;
using backend.Services;

namespace backend.BackgroundServices;

public sealed class BatchCloseHandler : IHostedService
{
    private readonly TelemetryBatcher _batcher;
    private readonly DisconnectDetector _disconnectDetector;
    private readonly ILogger<BatchCloseHandler> _logger;

    public BatchCloseHandler(
        TelemetryBatcher batcher,
        DisconnectDetector disconnectDetector,
        ILogger<BatchCloseHandler> logger
    )
    {
        _batcher = batcher;
        _disconnectDetector = disconnectDetector;
        _logger = logger;
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

        _logger.LogInformation(
            "Batch {BatchDate:yyyy-MM-dd} closed: {PacketCount} packets, {New} newly disconnected, {Back} reconnected, {Offline} offline.",
            batch.Timestamp,
            batch.Packets.Count,
            disconnects.NewlyDisconnected,
            disconnects.Reconnected,
            disconnects.TotalDisconnected
        );
    }
}
