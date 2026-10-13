using backend.Models.Telemetry;
using backend.Services;

namespace backend.BackgroundServices;

public class TelemetryConsumer : BackgroundService
{
    private readonly TelemetryQueue _queue;
    private readonly TelemetryProcessor _processor;
    private readonly ILogger<TelemetryConsumer> _logger;

    public TelemetryConsumer(
        TelemetryQueue queue,
        TelemetryProcessor processor,
        ILogger<TelemetryConsumer> logger
    )
    {
        _queue = queue;
        _processor = processor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            QueuedTelemetry item;

            try
            {
                item = await _queue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                _processor.Process(item);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to process telemetry from {DeviceId}.",
                    item.Reading.DeviceId
                );
            }
        }
    }
}
