using backend.Models.Commands;
using backend.Models.Live;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs;

public interface ITelemetryClient
{
    Task BatchClosed(DashboardSummary summary);
    Task AlertRaised(AlertEvent alert);
    Task CommandsChanged(CommandRecord record);
}

public sealed class TelemetryHub : Hub<ITelemetryClient> { }
