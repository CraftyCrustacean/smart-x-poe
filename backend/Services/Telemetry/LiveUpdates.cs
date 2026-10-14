using backend.Hubs;
using backend.Models.Live;
using Microsoft.AspNetCore.SignalR;

namespace backend.Services;

public sealed class LiveUpdates
{
    private readonly IHubContext<TelemetryHub, ITelemetryClient> _hub;
    private readonly ILogger<LiveUpdates> _logger;

    public LiveUpdates(IHubContext<TelemetryHub, ITelemetryClient> hub, ILogger<LiveUpdates> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public void BatchClosed(DashboardSummary summary) =>
        _ = SendAsync(clients => clients.BatchClosed(summary), nameof(BatchClosed));

    public void AlertRaised(AlertEvent alert) =>
        _ = SendAsync(clients => clients.AlertRaised(alert), nameof(AlertRaised));

    private async Task SendAsync(Func<ITelemetryClient, Task> send, string eventName)
    {
        try
        {
            await send(_hub.Clients.All);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR: {Event} failed.", eventName);
        }
    }
}
