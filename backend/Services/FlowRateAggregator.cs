using backend.Models.Readings;
using backend.Models.Topology;
using static backend.Models.Provision.ProvisionData;

namespace backend.Services;

public class FlowRateAggregator
{
    private readonly FlowRateHistory _history;

    public FlowRateAggregator(FlowRateHistory history)
    {
        _history = history;
    }
    public static FlowRateAggregate FromReading(FlowRateReading reading)
    {
        ArgumentNullException.ThrowIfNull(reading);

        return new FlowRateAggregate
        {
            LocationId = reading.DeviceId,
            TimeStamp = reading.TimeStamp,
            FlowRateTotal = reading.FlowRate
        };
    }

    public FlowRateAggregate? AggregateFlowRate(IHierarchyNode node)
    {
        ArgumentNullException.ThrowIfNull(node);

        if (node is Node leaf)
        {
            if (leaf.Category != DeviceCategory.FlowRate)
                return null;

            return _history.TryGetPrevious(leaf.Identifier, out var reading) && reading != null
                ? FromReading(reading)
                : null;
        }

        var childAggregates = node.GetChildren()
            .Select(child => AggregateFlowRate(child))
            .OfType<FlowRateAggregate>()
            .ToList();

        if (childAggregates.Count == 0)
            return null;

        var folded = childAggregates.Aggregate((acc, next) => acc + next);

        folded.LocationId = node.Identifier;

        return folded;
    }
}
