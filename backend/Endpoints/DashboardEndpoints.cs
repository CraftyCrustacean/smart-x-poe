using backend.Services.Snapshots;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        // GET /api/dashboard/summary
        app.MapGet(
            "/api/dashboard/summary",
            (DashboardSummaryService summary) => Results.Ok(summary.Build())
        );
        // GET /api/thresholds (the configured critical thresholds, so the UI never hardcodes them)
        app.MapGet(
            "/api/thresholds",
            (IOptions<ThresholdSettings> options) => Results.Ok(options.Value)
        );
    }
}
