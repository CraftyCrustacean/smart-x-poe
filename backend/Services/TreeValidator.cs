using backend.Models.Topology;

namespace backend.Services;

public static class TreeValidator
{

    public static TreeValidationResult Validate(IEnumerable<Region> regions)
    {
        var errors = new List<string>();

        foreach (var region in regions)
        {
            ValidateNode(region, errors);
        }

        return new TreeValidationResult(errors.Count == 0, errors);
    }

    private static void ValidateNode(IHierarchyNode node, List<string> errors)
    {
        if (node is Zone zone)
        {
            ValidateZoneRules(zone, errors);
        }
        else if (node is SubZone subZone)
        {
            ValidateSubZoneRules(subZone, errors);
        }

        foreach (var child in node.GetChildren())
        {
            ValidateNode(child, errors);
        }
    }

    private static void ValidateSubZoneRules(SubZone subZone, List<string> errors)
    {
        var nodesByCategory = subZone.Nodes.GroupBy(node => node.Category);

        foreach (var categoryGroup in nodesByCategory)
        {
            var category = categoryGroup.Key;
            var nodes = categoryGroup.ToList();

            for (int i = 0; i < nodes.Count - 1; i++)
            {
                var current = nodes[i];
                var next = nodes[i + 1];

                if (next.Chainage <= current.Chainage)
                {
                    errors.Add(
                        $"SubZone {subZone.SubZoneId} sequencing error at node: {next.DeviceId} of category {next.Category} " +
                        $"({next.Chainage} km) must be greater than previous node {current.DeviceId} of category {current.Category}" +
                        $"({current.Chainage} km)."
                    );
                }
            }
        }
    }

    private static void ValidateZoneRules(Zone zone, List<string> errors)
    {
        var validSubZones = new List<(SubZone SubZone, int Index)>();

        foreach (var sz in zone.SubZones)
        {
            if (TryParseSubZoneIndex(sz.SubZoneId, out int index))
            {
                validSubZones.Add((sz, index));
            }
            else
            {
                errors.Add($"Zone {zone.ZoneId} contains a SubZone with a malformed identifier: {sz.SubZoneId}.");
            }
        }

        var sortedSubZones = validSubZones
            .OrderBy(pair => pair.Index)
            .Select(pair => pair.SubZone)
            .ToList();

        for (int i = 0; i < sortedSubZones.Count - 1; i++)
        {
            var currentSubZone = sortedSubZones[i];
            var nextSubZone = sortedSubZones[i + 1];

            if (!currentSubZone.Nodes.Any() || !nextSubZone.Nodes.Any())
                continue;

            float maxCurrentChainage = currentSubZone.Nodes.Max(n => n.Chainage);
            float minNextChainage = nextSubZone.Nodes.Min(n => n.Chainage);

            if (minNextChainage <= maxCurrentChainage)
            {
                errors.Add(
                    $"Zone {zone.ZoneId} error: All nodes in {nextSubZone.SubZoneId} " +
                    $"must exceed max chainage of {currentSubZone.SubZoneId} ({maxCurrentChainage} km), " +
                    $"but found minimum chainage of {minNextChainage} km."
                );
            }
        }
    }

    public class TreeValidationResult
    {
        public bool IsValid { get; }

        public List<string> Errors { get; }

        public TreeValidationResult(bool isValid, List<string> errors)
        {
            IsValid = isValid;
            Errors = errors;
        }
    }
    private static bool TryParseSubZoneIndex(string subZoneId, out int index)
    {
        var parts = subZoneId.Split('-');
        if (parts.Length > 1 && int.TryParse(parts[^1], out index))
        {
            return true;
        }

        index = 0;
        return false;
    }
}
