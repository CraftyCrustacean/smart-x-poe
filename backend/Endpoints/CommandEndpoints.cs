using backend.Models.Commands;
using backend.Services.Commands;
using backend.Services.Insights;
using backend.Services.State;

namespace backend.Endpoints;

public static class CommandEndpoints
{
    public static void MapCommandEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/commands");

        // POST /api/commands
        group.MapPost(
            "/",
            (CommandRequest request, CommandService commands, InsightEngine insights) =>
            {
                var outcome = commands.Issue(request);
                if (outcome.Record is null)
                    return Results.BadRequest(new { message = outcome.Error });

                insights.LearnFromCommand(outcome.Record);
                insights.Rebuild();
                return Results.Ok(outcome.Record);
            }
        );

        // POST /api/commands/undo
        group.MapPost(
            "/undo",
            (CommandService commands, InsightEngine insights) =>
            {
                if (commands.Undo() is not { } undone)
                    return Results.Conflict(new { message = "Nothing to undo." });

                insights.ForgetCommand(undone);
                insights.Rebuild();
                return Results.Ok(undone);
            }
        );

        // GET /api/commands
        group.MapGet(
            "/",
            (CommandService commands, BatchClock clock) =>
            {
                var (history, undoableId) = commands.GetHistory();
                return Results.Ok(
                    new
                    {
                        undoableId,
                        currentBatch = clock.Current,
                        graceBatches = CommandService.GraceBatches,
                        history,
                    }
                );
            }
        );
    }
}
