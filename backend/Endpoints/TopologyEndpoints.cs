using backend.Services;

namespace backend.Endpoints;

public static class TopologyEndpoints
{
    public static void MapTopologyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/topology");

        // GET /api/topology/validate
        group.MapGet("/validate", async (DeviceStore store) =>
        {
            var devices = await store.GetAllDevices();
            var tree = TopologyBuilder.BuildTree(devices);
            var validationResult = TreeValidator.Validate(tree);

            return Results.Ok(validationResult);
        });

        // GET /api/topology/flowrate
        group.MapGet("/flowrate", async (
            DeviceStore store,
            FlowRateAggregator aggregator) =>
        {
            var devices = await store.GetAllDevices();
            var tree = TopologyBuilder.BuildTree(devices);

            var regionalAggregates = tree
                .Select(region => aggregator.AggregateFlowRate(region))
                .Where(aggregate => aggregate is not null)
                .ToList();

            return Results.Ok(regionalAggregates);
        });
    }
}
