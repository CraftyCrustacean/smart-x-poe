using backend.Models.Insights;
using backend.Services.Insights;

namespace backend.Endpoints;

public static class InsightEndpoints
{
    public static void MapInsightEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/insights");

        // GET /api/insights?type=flow_rate_lps
        group.MapGet(
            "/",
            (string? type, InsightEngine engine) =>
                Results.Ok(
                    new
                    {
                        suggestions = engine.Current(type),
                        maxSuggestions = InsightEngine.MaxSuggestions,
                        minSupport = InsightEngine.MinSupport,
                    }
                )
        );

        // GET /api/insights/model
        group.MapGet("/model", (InsightEngine engine) => Results.Ok(engine.Model()));

        // POST /api/insights/dismiss
        group.MapPost(
            "/dismiss",
            (DismissRequest request, InsightEngine engine) =>
            {
                engine.Dismiss(request);
                return Results.NoContent();
            }
        );
    }
}
