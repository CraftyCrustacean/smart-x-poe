using backend.Models.Snapshots;
using backend.Services;

namespace backend.Endpoints;

public static class SnapshotEndpoints
{
    private static readonly HashSet<string> KnownMetrics =
    [
        "elevation_change_mm",
        "surface_temperature_c",
        "colour_shift_index",
        "flow_rate_lps",
        "battery_level_pct",
    ];

    public static void MapSnapshotEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/snapshots");

        // GET /api/snapshots/series?X&points=7
        // GET /api/snapshots/series?metric=X&zone=X&points=30
        group.MapGet(
            "/series",
            (string metric, string? zone, int? points, SnapshotStore store) =>
            {
                if (!KnownMetrics.Contains(metric))
                {
                    return Results.BadRequest(new { message = $"Unknown metric '{metric}'." });
                }

                var count = Math.Clamp(points ?? SnapshotStore.Capacity, 1, SnapshotStore.Capacity);

                var series = ScopesFor(store, zone)
                    .Select(scope => new
                    {
                        scope.Zone,
                        scope.Subzone,
                        Points = store
                            .GetSeries(scope, count)
                            .Where(s => s.Metrics.ContainsKey(metric))
                            .Select(s => new { s.BatchTimestamp, Summary = s.Metrics[metric] })
                            .ToList(),
                    })
                    .ToList();

                return Results.Ok(series);
            }
        );

        // GET /api/snapshots/latest
        // GET /api/snapshots/latest?zone=X
        group.MapGet(
            "/latest",
            (string? zone, SnapshotStore store) =>
                Results.Ok(
                    ScopesFor(store, zone)
                        .Select(scope => new
                        {
                            scope.Zone,
                            scope.Subzone,
                            Snapshot = store.GetLatest(scope),
                        })
                        .Where(x => x.Snapshot is not null)
                        .ToList()
                )
        );
    }

    private static IEnumerable<ScopeKey> ScopesFor(SnapshotStore store, string? zone) =>
        zone is null
            ? store.GetScopes().Where(s => s.IsZone).OrderBy(s => s.Zone)
            : store
                .GetScopes()
                .Where(s => s.Zone == zone && !s.IsZone)
                .OrderBy(s => SubzoneNumber(s.Subzone!));

    private static int SubzoneNumber(string subzone) =>
        int.TryParse(subzone.AsSpan(subzone.LastIndexOf('-') + 1), out var number)
            ? number
            : int.MaxValue;
}
