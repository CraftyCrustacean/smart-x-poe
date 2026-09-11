using backend.Models.Provision;
using backend.Models.Topology;

namespace backend.Services;

    public class TopologyBuilder
    {
    public static List<Region> BuildTree(IEnumerable<ProvisionData> flatDevices)
    {
        ArgumentNullException.ThrowIfNull(flatDevices);

        return flatDevices
            .GroupBy(d => d.TopologyData.Region)
            .Select(regionGroup => new Region
            {
                RegionId = regionGroup.Key,
                Zones = regionGroup
                    .GroupBy(d => d.TopologyData.Zone)
                    .Select(zoneGroup => new Zone
                    {
                        ZoneId = zoneGroup.Key,
                        SubZones = zoneGroup
                            .GroupBy(d => d.TopologyData.Subzone)
                            .Select(subzoneGroup => new SubZone
                            {
                                SubZoneId = subzoneGroup.Key,
                                Nodes = subzoneGroup
                                    .Select(d => new Node { DeviceId = d.DeviceId, Category = d.Category, Chainage = d.LocationData.Chainage })
                                    .ToList()
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .ToList();
    }
}

private void ValidateNode(IHierarchyNode node, List<string> errors)
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