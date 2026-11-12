using backend.Models.Commands;
using backend.Models.Live;
using backend.Models.Mesh;
using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs;

public interface ITelemetryClient
{
    Task BatchClosed(DashboardSummary summary);
    Task AlertRaised(AlertEvent alert);
    Task CommandsChanged(CommandRecord record);
    Task MeshChanged(MeshSummary summary);
}

public sealed class TelemetryHub : Hub<ITelemetryClient> { }
