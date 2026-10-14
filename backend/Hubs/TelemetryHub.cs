using backend.Models.Live;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs;

public interface ITelemetryClient
{
    Task BatchClosed(DashboardSummary summary);
    Task AlertRaised(AlertEvent alert);
}

public sealed class TelemetryHub : Hub<ITelemetryClient> { }
