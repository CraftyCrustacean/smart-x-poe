using backend.Models.Commands;
using backend.Services.Commands;

namespace backend.Endpoints;

public static class CommandEndpoints
{
    public static void MapCommandEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/commands");

        // POST /api/commands
        group.MapPost(
            "/",
            (CommandRequest request, CommandService commands) =>
            {
                var outcome = commands.Issue(request);
                return outcome.Record is null
                    ? Results.BadRequest(new { message = outcome.Error })
                    : Results.Ok(outcome.Record);
            }
        );

        // POST /api/commands/undo
        group.MapPost(
            "/undo",
            (CommandService commands) =>
                commands.Undo() is { } undone
                    ? Results.Ok(undone)
                    : Results.Conflict(new { message = "Nothing to undo." })
        );

        // GET /api/commands
        group.MapGet(
            "/",
            (CommandService commands) =>
            {
                var (history, undoableId) = commands.GetHistory();
                return Results.Ok(new { undoableId, history });
            }
        );
    }
}
