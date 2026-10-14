using backend.Services.Snapshots;


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
    }
}
